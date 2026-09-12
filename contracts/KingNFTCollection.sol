// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title KingNFTCollection
 * @notice ERC721Enumerable NFT collection with paid minting.
 *         On each mint: platformFeeBps → platformTreasury (push), remainder → creator (push).
 */
contract KingNFTCollection is ERC721Enumerable, Ownable, ReentrancyGuard, Pausable {
    uint256 public immutable maxSupply;
    uint256 public mintPrice;
    address public immutable creator;
    uint256 public immutable platformFeeBps;
    address public immutable platformTreasury;

    string private _baseTokenURI;
    uint256 private _nextTokenId = 1;

    uint256 public totalVolumeEth;
    uint256 public totalPlatformFeesEth;
    uint256 public totalCreatorProceedsEth;

    event MintWithFees(
        address indexed to,
        uint256 quantity,
        uint256 totalPaid,
        uint256 platformFee,
        uint256 creatorProceeds
    );
    event BaseURIUpdated(string newBaseURI);
    event MintPriceUpdated(uint256 newPrice);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        string memory baseURI_,
        address creator_,
        uint256 platformFeeBps_,
        address platformTreasury_
    ) ERC721(name_, symbol_) {
        require(maxSupply_ > 0, "maxSupply=0");
        require(creator_ != address(0), "creator=0");
        require(platformTreasury_ != address(0), "treasury=0");
        require(platformFeeBps_ <= 2500, "fee too high");
        maxSupply = maxSupply_;
        mintPrice = mintPrice_;
        _baseTokenURI = baseURI_;
        creator = creator_;
        platformFeeBps = platformFeeBps_;
        platformTreasury = platformTreasury_;
        // Ownership stays with deployer (factory) until factory transfers to creator
    }

    function mint(uint256 qty) external payable nonReentrant whenNotPaused {
        require(qty > 0 && qty <= 20, "bad qty");
        require(_nextTokenId + qty - 1 <= maxSupply, "sold out");
        uint256 totalCost = mintPrice * qty;
        require(msg.value >= totalCost, "insufficient ETH");

        uint256 platformFee = (totalCost * platformFeeBps) / 10_000;
        uint256 creatorProceeds = totalCost - platformFee;

        for (uint256 i = 0; i < qty; i++) {
            _safeMint(msg.sender, _nextTokenId);
            unchecked {
                _nextTokenId++;
            }
        }

        totalVolumeEth += totalCost;
        totalPlatformFeesEth += platformFee;
        totalCreatorProceedsEth += creatorProceeds;

        if (platformFee > 0) {
            (bool okP, ) = platformTreasury.call{value: platformFee}("");
            require(okP, "platform fee failed");
        }
        if (creatorProceeds > 0) {
            (bool okC, ) = creator.call{value: creatorProceeds}("");
            require(okC, "creator payment failed");
        }

        if (msg.value > totalCost) {
            (bool okR, ) = msg.sender.call{value: msg.value - totalCost}("");
            require(okR, "refund failed");
        }

        emit MintWithFees(msg.sender, qty, totalCost, platformFee, creatorProceeds);
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
        emit MintPriceUpdated(newPrice);
    }

    function pauseMinting() external onlyOwner {
        _pause();
    }

    function unpauseMinting() external onlyOwner {
        _unpause();
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    function remainingSupply() external view returns (uint256) {
        return maxSupply - (_nextTokenId - 1);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function baseURI() external view returns (string memory) {
        return _baseTokenURI;
    }

    function mintingPaused() external view returns (bool) {
        return paused();
    }
}
