// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function allowance(address, address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
}

interface IUniswapV2Router02 {
    function WETH() external pure returns (address);
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable;
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
}

/**
 * KingMarginVault - isolated MEME/ETH longs with real funds.
 * Lenders deposit ETH. Traders open longs up to maxLeverage (e.g. 50x)
 * by borrowing ETH from the pool, swapping to meme via Uniswap V2, holding tokens in vault.
 * Close sells tokens for ETH, repays debt + fee, returns equity to trader.
 * Liquidate when equity < maintenanceBps of notional debt.
 * Deploy + seed before use. Experimental - audit before large capital.
 */
contract KingMarginVault {
    IUniswapV2Router02 public immutable router;
    address public immutable WETH;
    address public owner;
    uint256 public maxLeverage = 50;
    uint256 public openFeeBps = 10; // 0.10%
    uint256 public closeFeeBps = 10;
    uint256 public maintenanceBps = 200; // 2% equity vs debt
    uint256 public totalLenderEth;
    uint256 public totalDebtEth;

    struct Position {
        address trader;
        address token;
        uint256 tokenAmount;
        uint256 marginEth;
        uint256 debtEth;
        uint256 openedAt;
        bool open;
    }

    mapping(uint256 => Position) public positions;
    uint256 public nextId = 1;
    mapping(address => uint256) public lenderShares;
    uint256 public totalShares;

    event LenderDeposit(address indexed lender, uint256 ethIn, uint256 shares);
    event LenderWithdraw(address indexed lender, uint256 ethOut, uint256 shares);
    event OpenLong(uint256 indexed id, address indexed trader, address token, uint256 margin, uint256 debt, uint256 tokens);
    event CloseLong(uint256 indexed id, address indexed trader, uint256 equityOut, uint256 fee);
    event Liquidate(uint256 indexed id, address indexed liquidator, uint256 reward);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address router_) {
        router = IUniswapV2Router02(router_);
        WETH = IUniswapV2Router02(router_).WETH();
        owner = msg.sender;
    }

    receive() external payable {}

    function setParams(uint256 maxLev, uint256 openBps, uint256 closeBps, uint256 maintBps) external onlyOwner {
        require(maxLev >= 1 && maxLev <= 50, "lev");
        maxLeverage = maxLev;
        openFeeBps = openBps;
        closeFeeBps = closeBps;
        maintenanceBps = maintBps;
    }

    function depositLender() external payable {
        require(msg.value > 0, "zero");
        uint256 shares;
        if (totalShares == 0 || totalLenderEth == 0) {
            shares = msg.value;
        } else {
            shares = (msg.value * totalShares) / totalLenderEth;
        }
        require(shares > 0, "shares");
        lenderShares[msg.sender] += shares;
        totalShares += shares;
        totalLenderEth += msg.value;
        emit LenderDeposit(msg.sender, msg.value, shares);
    }

    function withdrawLender(uint256 shares) external {
        require(shares > 0 && lenderShares[msg.sender] >= shares, "shares");
        uint256 ethOut = (shares * totalLenderEth) / totalShares;
        uint256 free = address(this).balance;
        // reserved for debts roughly: keep totalDebt buffer
        require(ethOut <= free, "liquidity");
        lenderShares[msg.sender] -= shares;
        totalShares -= shares;
        totalLenderEth -= ethOut;
        (bool ok, ) = msg.sender.call{value: ethOut}("");
        require(ok, "xfer");
        emit LenderWithdraw(msg.sender, ethOut, shares);
    }

    function openLong(address token, uint256 leverage, uint256 amountOutMin) external payable returns (uint256 id) {
        require(msg.value > 0, "margin");
        require(leverage >= 1 && leverage <= maxLeverage, "lev");
        require(token != address(0) && token != WETH, "token");
        uint256 margin = msg.value;
        uint256 notional = margin * leverage;
        uint256 fee = (notional * openFeeBps) / 10000;
        uint256 debt = notional - margin;
        require(debt + fee <= address(this).balance - margin, "pool liquidity");
        // fee stays in vault for lenders
        totalDebtEth += debt;
        // swap margin+debt to tokens (all held by vault)
        uint256 spend = margin + debt;
        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = token;
        uint256 before = IERC20(token).balanceOf(address(this));
        router.swapExactETHForTokensSupportingFeeOnTransferTokens{value: spend}(
            amountOutMin,
            path,
            address(this),
            block.timestamp + 600
        );
        uint256 got = IERC20(token).balanceOf(address(this)) - before;
        require(got > 0, "swap");
        id = nextId++;
        positions[id] = Position({
            trader: msg.sender,
            token: token,
            tokenAmount: got,
            marginEth: margin,
            debtEth: debt,
            openedAt: block.timestamp,
            open: true
        });
        emit OpenLong(id, msg.sender, token, margin, debt, got);
    }

    function _positionEquity(uint256 id, uint256 ethFromSell) internal view returns (uint256 equity, uint256 repay) {
        Position storage p = positions[id];
        repay = p.debtEth;
        if (ethFromSell > repay) equity = ethFromSell - repay;
        else equity = 0;
    }

    function closeLong(uint256 id, uint256 amountOutMinEth) external {
        Position storage p = positions[id];
        require(p.open && p.trader == msg.sender, "pos");
        address token = p.token;
        uint256 amt = p.tokenAmount;
        IERC20(token).approve(address(router), amt);
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = WETH;
        uint256 before = address(this).balance;
        router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amt,
            amountOutMinEth,
            path,
            address(this),
            block.timestamp + 600
        );
        uint256 got = address(this).balance - before;
        uint256 debt = p.debtEth;
        require(got >= debt, "underwater - liquidate");
        uint256 equity = got - debt;
        uint256 fee = (equity * closeFeeBps) / 10000;
        uint256 payout = equity - fee;
        totalDebtEth -= debt;
        p.open = false;
        p.tokenAmount = 0;
        (bool ok, ) = msg.sender.call{value: payout}("");
        require(ok, "xfer");
        emit CloseLong(id, msg.sender, payout, fee);
    }

    function liquidate(uint256 id, uint256 amountOutMinEth) external {
        Position storage p = positions[id];
        require(p.open, "closed");
        address token = p.token;
        uint256 amt = p.tokenAmount;
        IERC20(token).approve(address(router), amt);
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = WETH;
        uint256 before = address(this).balance;
        router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amt,
            amountOutMinEth,
            path,
            address(this),
            block.timestamp + 600
        );
        uint256 got = address(this).balance - before;
        uint256 debt = p.debtEth;
        // maintenance: equity < maintenanceBps of debt
        uint256 equity = got > debt ? got - debt : 0;
        require(equity * 10000 < debt * maintenanceBps || got < debt, "healthy");
        totalDebtEth -= debt > totalDebtEth ? totalDebtEth : debt;
        p.open = false;
        p.tokenAmount = 0;
        uint256 reward = got / 100; // 1% to liquidator if available
        if (reward > 0 && reward <= address(this).balance) {
            (bool ok, ) = msg.sender.call{value: reward}("");
            require(ok, "xfer");
        }
        emit Liquidate(id, msg.sender, reward);
    }
}
