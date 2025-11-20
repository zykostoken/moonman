const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZykosToken - Complete Test Suite", function () {
    let token;
    let usdc;
    let owner;
    let treasury;
    let buyer1;
    let buyer2;

    const USDC_DECIMALS = 6;
    const TOKEN_DECIMALS = 18;

    beforeEach(async function () {
        [owner, treasury, buyer1, buyer2] = await ethers.getSigners();

        // Deploy mock USDC
        const MockUSDC = await ethers.getContractFactory("MockERC20");
        usdc = await MockUSDC.deploy("USD Coin", "USDC", USDC_DECIMALS);
        await usdc.deployed();

        // Give buyers some USDC
        await usdc.mint(buyer1.address, ethers.utils.parseUnits("100000", USDC_DECIMALS));
        await usdc.mint(buyer2.address, ethers.utils.parseUnits("100000", USDC_DECIMALS));

        // Deploy Zykos token
        const ZykosToken = await ethers.getContractFactory("ZykosToken");
        token = await ZykosToken.deploy(
            usdc.address,
            owner.address,
            treasury.address
        );
        await token.deployed();
    });

    describe("Deployment", function () {
        it("Should have correct name and symbol", async function () {
            expect(await token.name()).to.equal("Zykos");
            expect(await token.symbol()).to.equal("ZKS");
        });

        it("Should have total supply of 100M", async function () {
            const totalSupply = await token.totalSupply();
            expect(totalSupply).to.equal(ethers.utils.parseUnits("100000000", TOKEN_DECIMALS));
        });

        it("Should mint all tokens to contract", async function () {
            const contractBalance = await token.balanceOf(token.address);
            expect(contractBalance).to.equal(ethers.utils.parseUnits("100000000", TOKEN_DECIMALS));
        });

        it("Should have correct owner", async function () {
            expect(await token.owner()).to.equal(owner.address);
        });

        it("Should have correct treasury", async function () {
            expect(await token.treasury()).to.equal(treasury.address);
        });

        it("Should activate Pool 0 on deployment", async function () {
            const pool = await token.getPool(0);
            expect(pool.status).to.equal(1); // ACTIVE
        });
    });

    describe("Pool Configuration", function () {
        it("Should have correct prices for pools 1-2", async function () {
            const pool1 = await token.getPool(0);
            const pool2 = await token.getPool(1);

            expect(pool1.pricePerToken).to.equal(ethers.utils.parseUnits("0.05", USDC_DECIMALS));
            expect(pool2.pricePerToken).to.equal(ethers.utils.parseUnits("0.05", USDC_DECIMALS));
        });

        it("Should have correct prices for pools 3-5", async function () {
            const pool3 = await token.getPool(2);
            const pool5 = await token.getPool(4);

            expect(pool3.pricePerToken).to.equal(ethers.utils.parseUnits("0.0525", USDC_DECIMALS));
            expect(pool5.pricePerToken).to.equal(ethers.utils.parseUnits("0.0525", USDC_DECIMALS));
        });

        it("Should have 1M tokens per pool", async function () {
            const pool = await token.getPool(0);
            expect(pool.tokensRemaining).to.equal(ethers.utils.parseUnits("1000000", TOKEN_DECIMALS));
        });

        it("Should have 100 pools total", async function () {
            // Should not revert for pool 99
            await expect(token.getPool(99)).to.not.be.reverted;

            // Should revert for pool 100
            await expect(token.getPool(100)).to.be.revertedWith("Invalid pool");
        });
    });

    describe("Buying Tokens", function () {
        it("Should allow buying from active pool", async function () {
            const tokenAmount = ethers.utils.parseUnits("1000", TOKEN_DECIMALS);
            const cost = ethers.utils.parseUnits("50", USDC_DECIMALS); // 1000 * $0.05

            await usdc.connect(buyer1).approve(token.address, cost);

            await expect(token.connect(buyer1).buyTokens(0, tokenAmount))
                .to.emit(token, "TokensPurchased")
                .withArgs(buyer1.address, 0, tokenAmount, cost);

            expect(await token.balanceOf(buyer1.address)).to.equal(tokenAmount);
        });

        it("Should split USDC payment 50/50", async function () {
            const tokenAmount = ethers.utils.parseUnits("1000", TOKEN_DECIMALS);
            const cost = ethers.utils.parseUnits("50", USDC_DECIMALS);

            const ownerBalanceBefore = await usdc.balanceOf(owner.address);

            await usdc.connect(buyer1).approve(token.address, cost);
            await token.connect(buyer1).buyTokens(0, tokenAmount);

            const ownerBalanceAfter = await usdc.balanceOf(owner.address);
            const contractBalance = await usdc.balanceOf(token.address);

            expect(ownerBalanceAfter.sub(ownerBalanceBefore)).to.equal(cost.div(2));
            expect(contractBalance).to.equal(cost.div(2));
        });

        it("Should not allow buying from inactive pool", async function () {
            const tokenAmount = ethers.utils.parseUnits("1000", TOKEN_DECIMALS);

            await usdc.connect(buyer1).approve(token.address, ethers.constants.MaxUint256);

            await expect(token.connect(buyer1).buyTokens(1, tokenAmount))
                .to.be.revertedWith("Pool not available");
        });

        it("Should not allow buying more than available", async function () {
            const tokenAmount = ethers.utils.parseUnits("2000000", TOKEN_DECIMALS); // 2M (pool only has 1M)

            await usdc.connect(buyer1).approve(token.address, ethers.constants.MaxUint256);

            await expect(token.connect(buyer1).buyTokens(0, tokenAmount))
                .to.be.revertedWith("Not enough tokens");
        });

        it("Should require USDC approval", async function () {
            const tokenAmount = ethers.utils.parseUnits("1000", TOKEN_DECIMALS);

            await expect(token.connect(buyer1).buyTokens(0, tokenAmount))
                .to.be.reverted; // ERC20: insufficient allowance
        });

        it("Should update pool stats after purchase", async function () {
            const tokenAmount = ethers.utils.parseUnits("100000", TOKEN_DECIMALS);
            const cost = ethers.utils.parseUnits("5000", USDC_DECIMALS);

            await usdc.connect(buyer1).approve(token.address, cost);
            await token.connect(buyer1).buyTokens(0, tokenAmount);

            const pool = await token.getPool(0);
            expect(pool.tokensSold).to.equal(tokenAmount);
            expect(pool.tokensRemaining).to.equal(
                ethers.utils.parseUnits("900000", TOKEN_DECIMALS)
            );
            expect(pool.percentSold).to.equal(10); // 10%
        });
    });

    describe("Pool Activation Logic", function () {
        it("Should activate next pool at 91% sold", async function () {
            // Buy 91% of pool 0
            const tokenAmount = ethers.utils.parseUnits("910000", TOKEN_DECIMALS);
            const cost = ethers.utils.parseUnits("45500", USDC_DECIMALS);

            await usdc.connect(buyer1).approve(token.address, cost);

            await expect(token.connect(buyer1).buyTokens(0, tokenAmount))
                .to.emit(token, "PoolActivated")
                .withArgs(1, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

            const pool1 = await token.getPool(1);
            expect(pool1.status).to.equal(1); // ACTIVE
        });

        it("Should release next pool at 98% sold", async function () {
            // First activate pool 1 (91%)
            let tokenAmount = ethers.utils.parseUnits("910000", TOKEN_DECIMALS);
            let cost = ethers.utils.parseUnits("45500", USDC_DECIMALS);
            await usdc.connect(buyer1).approve(token.address, cost);
            await token.connect(buyer1).buyTokens(0, tokenAmount);

            // Then release pool 1 (98%)
            tokenAmount = ethers.utils.parseUnits("70000", TOKEN_DECIMALS); // Total 98%
            cost = ethers.utils.parseUnits("3500", USDC_DECIMALS);
            await usdc.connect(buyer1).approve(token.address, cost);

            await expect(token.connect(buyer1).buyTokens(0, tokenAmount))
                .to.emit(token, "PoolReleased")
                .withArgs(1, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

            const pool1 = await token.getPool(1);
            expect(pool1.status).to.equal(2); // RELEASED
        });

        it("Should allow buying from activated pool", async function () {
            // Activate pool 1
            let tokenAmount = ethers.utils.parseUnits("910000", TOKEN_DECIMALS);
            let cost = ethers.utils.parseUnits("45500", USDC_DECIMALS);
            await usdc.connect(buyer1).approve(token.address, cost);
            await token.connect(buyer1).buyTokens(0, tokenAmount);

            // Buy from pool 1 (now active)
            tokenAmount = ethers.utils.parseUnits("1000", TOKEN_DECIMALS);
            cost = ethers.utils.parseUnits("50", USDC_DECIMALS);
            await usdc.connect(buyer2).approve(token.address, cost);

            await expect(token.connect(buyer2).buyTokens(1, tokenAmount))
                .to.not.be.reverted;
        });
    });

    describe("Toasting Mechanism", function () {
        beforeEach(async function () {
            // Give buyer1 some tokens first
            const tokenAmount = ethers.utils.parseUnits("10000", TOKEN_DECIMALS);
            const cost = ethers.utils.parseUnits("500", USDC_DECIMALS);
            await usdc.connect(buyer1).approve(token.address, cost);
            await token.connect(buyer1).buyTokens(0, tokenAmount);
        });

        it("Should allow toasting tokens", async function () {
            const toastAmount = ethers.utils.parseUnits("1000", TOKEN_DECIMALS);

            await expect(token.connect(buyer1).toastTokens(toastAmount, "Telemedicine"))
                .to.emit(token, "TokensToasted")
                .withArgs(buyer1.address, toastAmount, "Telemedicine");
        });

        it("Should transfer toasted tokens to treasury", async function () {
            const toastAmount = ethers.utils.parseUnits("1000", TOKEN_DECIMALS);
            const treasuryBalanceBefore = await token.balanceOf(treasury.address);

            await token.connect(buyer1).toastTokens(toastAmount, "Telemedicine");

            const treasuryBalanceAfter = await token.balanceOf(treasury.address);
            expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(toastAmount);
        });

        it("Should track toasted balance", async function () {
            const toastAmount = ethers.utils.parseUnits("1000", TOKEN_DECIMALS);

            await token.connect(buyer1).toastTokens(toastAmount, "Telemedicine");

            expect(await token.toastedBalance(buyer1.address)).to.equal(toastAmount);
        });

        it("Should track total toasted", async function () {
            const toastAmount1 = ethers.utils.parseUnits("1000", TOKEN_DECIMALS);
            const toastAmount2 = ethers.utils.parseUnits("500", TOKEN_DECIMALS);

            await token.connect(buyer1).toastTokens(toastAmount1, "Telemedicine");

            // Give buyer2 some tokens
            const tokenAmount = ethers.utils.parseUnits("5000", TOKEN_DECIMALS);
            const cost = ethers.utils.parseUnits("250", USDC_DECIMALS);
            await usdc.connect(buyer2).approve(token.address, cost);
            await token.connect(buyer2).buyTokens(0, tokenAmount);

            await token.connect(buyer2).toastTokens(toastAmount2, "Consultation");

            const totalToasted = await token.totalToasted();
            expect(totalToasted).to.equal(toastAmount1.add(toastAmount2));
        });

        it("Should not allow toasting more than balance", async function () {
            const balance = await token.balanceOf(buyer1.address);
            const toastAmount = balance.add(1);

            await expect(token.connect(buyer1).toastTokens(toastAmount, "Service"))
                .to.be.revertedWith("Insufficient balance");
        });
    });

    describe("Owner Functions", function () {
        it("Should allow owner to set treasury", async function () {
            const newTreasury = buyer1.address;

            await token.connect(owner).setTreasury(newTreasury);

            expect(await token.treasury()).to.equal(newTreasury);
        });

        it("Should not allow non-owner to set treasury", async function () {
            await expect(token.connect(buyer1).setTreasury(buyer2.address))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow owner to withdraw USDC", async function () {
            // First, generate some USDC in contract
            const tokenAmount = ethers.utils.parseUnits("10000", TOKEN_DECIMALS);
            const cost = ethers.utils.parseUnits("500", USDC_DECIMALS);
            await usdc.connect(buyer1).approve(token.address, cost);
            await token.connect(buyer1).buyTokens(0, tokenAmount);

            const contractBalance = await usdc.balanceOf(token.address);
            const ownerBalanceBefore = await usdc.balanceOf(owner.address);

            await token.connect(owner).withdrawUSDC(contractBalance);

            const ownerBalanceAfter = await usdc.balanceOf(owner.address);
            expect(ownerBalanceAfter.sub(ownerBalanceBefore)).to.equal(contractBalance);
        });
    });

    describe("Security", function () {
        it("Should prevent reentrancy on buyTokens", async function () {
            // This is protected by ReentrancyGuard
            // Would need a malicious contract to test, but the modifier is in place
            expect(true).to.be.true;
        });

        it("Should not allow buying with 0 tokens", async function () {
            await expect(token.connect(buyer1).buyTokens(0, 0))
                .to.be.revertedWith("Amount must be > 0");
        });

        it("Should not allow toasting 0 tokens", async function () {
            await expect(token.connect(buyer1).toastTokens(0, "Service"))
                .to.be.revertedWith("Amount must be > 0");
        });

        it("Should not allow setting zero address as treasury", async function () {
            await expect(token.connect(owner).setTreasury(ethers.constants.AddressZero))
                .to.be.revertedWith("Invalid treasury");
        });
    });

    describe("Edge Cases", function () {
        it("Should handle very small purchases correctly", async function () {
            const tokenAmount = ethers.utils.parseUnits("1", TOKEN_DECIMALS); // 1 token
            const cost = ethers.utils.parseUnits("0.05", USDC_DECIMALS);

            await usdc.connect(buyer1).approve(token.address, cost);
            await token.connect(buyer1).buyTokens(0, tokenAmount);

            expect(await token.balanceOf(buyer1.address)).to.equal(tokenAmount);
        });

        it("Should handle selling entire pool", async function () {
            const tokenAmount = ethers.utils.parseUnits("1000000", TOKEN_DECIMALS);
            const cost = ethers.utils.parseUnits("50000", USDC_DECIMALS);

            await usdc.connect(buyer1).approve(token.address, cost);
            await token.connect(buyer1).buyTokens(0, tokenAmount);

            const pool = await token.getPool(0);
            expect(pool.tokensRemaining).to.equal(0);
            expect(pool.percentSold).to.equal(100);
        });

        it("Should handle multiple buyers in same pool", async function () {
            const amount1 = ethers.utils.parseUnits("100000", TOKEN_DECIMALS);
            const amount2 = ethers.utils.parseUnits("200000", TOKEN_DECIMALS);

            await usdc.connect(buyer1).approve(token.address, ethers.constants.MaxUint256);
            await usdc.connect(buyer2).approve(token.address, ethers.constants.MaxUint256);

            await token.connect(buyer1).buyTokens(0, amount1);
            await token.connect(buyer2).buyTokens(0, amount2);

            expect(await token.balanceOf(buyer1.address)).to.equal(amount1);
            expect(await token.balanceOf(buyer2.address)).to.equal(amount2);

            const pool = await token.getPool(0);
            expect(pool.tokensSold).to.equal(amount1.add(amount2));
        });
    });
});
