// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./KingNFTCollection.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title KingNFTFactory
 * @notice Deploys KingNFTCollection instances. createFee (100%) → platformTreasury (push).
 *         Each collection uses defaultPlatformFeeBps on mints → same treasury.
 */
contract KingNFTFactory is Ownable, ReentrancyGuard {
    uint256 public createFee;
    uint256 public defaultPlatformFeeBps;
    address public platformTreasury;

    address[] public collections;
    mapping(address => address[]) private _collectionsByCreator;

    uint256 public totalVolumeEth; // sum of create fees + reported mint volume (optional)
    uint256 public totalPlatformFeesEth; // create fees + reported mint platform fees
    uint256 public totalCreateFeesEth;

    event CollectionCreated(
        address indexed collection,
        address indexed creator,
        string name,
        string symbol,
        uint256 maxSupply,
        uint256 mintPrice,
        string baseURI,
        uint256 platformFeeBps
    );
    event CreateFeePaid(address indexed creator, uint256 amount, address treasury);
    event CreateFeeUpdated(uint256 newFee);
    event DefaultPlatformFeeBpsUpdated(uint256 newBps);
    event PlatformTreasuryUpdated(address newTreasury);
    event VolumeReported(address indexed collection, uint256 volume, uint256 platformFees);

    constructor(address treasury_, uint256 defaultPlatformFeeBps_, uint256 createFee_) {
        require(treasury_ != address(0), "treasury=0");
        require(defaultPlatformFeeBps_ <= 2500, "fee too high");
        platformTreasury = treasury_;
        defaultPlatformFeeBps = defaultPlatformFeeBps_;
        createFee = createFee_;
    }

    /**
     */
    function createCollection(
        string calldata name_,
        string calldata symbol_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        string calldata baseURI_,
        uint256 /* creatorFeeBps_ */
    ) external payable nonReentrant returns (address collection) {
        require(msg.value >= createFee, "create fee");
        require(bytes(name_).length > 0 && bytes(symbol_).length > 0, "name/symbol");
        require(maxSupply_ > 0 && maxSupply_ <= 100_000, "bad supply");

        KingNFTCollection c = new KingNFTCollection(
            name_,
            symbol_,
            maxSupply_,
            mintPrice_,
            baseURI_,
            msg.sender,
            defaultPlatformFeeBps,
            platformTreasury
        );

        collection = address(c);
        c.transferOwnership(msg.sender);

        collections.push(collection);
        _collectionsByCreator[msg.sender].push(collection);

        if (createFee > 0) {
            (bool ok, ) = platformTreasury.call{value: createFee}("");
            require(ok, "create fee transfer failed");
            totalCreateFeesEth += createFee;
            totalPlatformFeesEth += createFee;
            totalVolumeEth += createFee;
            emit CreateFeePaid(msg.sender, createFee, platformTreasury);
        }

        if (msg.value > createFee) {
            (bool okR, ) = msg.sender.call{value: msg.value - createFee}("");
            require(okR, "refund failed");
        }

        emit CollectionCreated(
            collection,
            msg.sender,
            name_,
            symbol_,
            maxSupply_,
            mintPrice_,
            baseURI_,
            defaultPlatformFeeBps
        );
    }

    /// @notice Optional: collection or indexer can report mint volume for platform dashboards.
    function reportVolume(uint256 volumeEth, uint256 platformFeesEth) external {
        // Only known collections may report
        bool known = false;
        uint256 len = collections.length;
        for (uint256 i = 0; i < len; i++) {
            if (collections[i] == msg.sender) {
                known = true;
                break;
            }
        }
        require(known, "unknown collection");
        totalVolumeEth += volumeEth;
        totalPlatformFeesEth += platformFeesEth;
        emit VolumeReported(msg.sender, volumeEth, platformFeesEth);
    }

    function getCollections() external view returns (address[] memory) {
        return collections;
    }

    function collectionsCount() external view returns (uint256) {
        return collections.length;
    }

    function getCollectionsByCreator(address creator_) external view returns (address[] memory) {
        return _collectionsByCreator[creator_];
    }

    function setCreateFee(uint256 newFee) external onlyOwner {
        createFee = newFee;
        emit CreateFeeUpdated(newFee);
    }

    function setDefaultPlatformFeeBps(uint256 newBps) external onlyOwner {
        require(newBps <= 2500, "fee too high");
        defaultPlatformFeeBps = newBps;
        emit DefaultPlatformFeeBpsUpdated(newBps);
    }

    function setPlatformTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "treasury=0");
        platformTreasury = newTreasury;
        emit PlatformTreasuryUpdated(newTreasury);
    }

    /// @notice Rescue ETH accidentally sent to factory (fees are pushed to treasury; should be rare).
    function withdrawStuckETH(address to) external onlyOwner {
        require(to != address(0), "to=0");
        uint256 bal = address(this).balance;
        require(bal > 0, "empty");
        (bool ok, ) = to.call{value: bal}("");
        require(ok, "withdraw failed");
    }
}
