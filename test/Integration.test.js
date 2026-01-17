const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("TrustCircle Protocol - Integration Tests", function () {
    // Fixture to deploy all contracts
    async function deployContractsFixture() {
        const [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();

        // Deploy contracts
        const ReputationNFT = await ethers.getContractFactory("ReputationNFT");
        const reputationNFT = await ReputationNFT.deploy();

        const TrustCircle = await ethers.getContractFactory("TrustCircle");
        const trustCircle = await TrustCircle.deploy(await reputationNFT.getAddress());

        const LendingPool = await ethers.getContractFactory("LendingPool");
        const lendingPool = await LendingPool.deploy(
            await reputationNFT.getAddress(),
            await trustCircle.getAddress()
        );

        const AchievementBadges = await ethers.getContractFactory("AchievementBadges");
        const achievementBadges = await AchievementBadges.deploy(await reputationNFT.getAddress());

        // Set up permissions
        await reputationNFT.setAuthorizedUpdater(await lendingPool.getAddress(), true);
        await reputationNFT.setAuthorizedUpdater(await trustCircle.getAddress(), true);
        await reputationNFT.setAuthorizedUpdater(await achievementBadges.getAddress(), true);
        await achievementBadges.setAuthorizedUnlocker(await lendingPool.getAddress(), true);

        return {
            reputationNFT,
            trustCircle,
            lendingPool,
            achievementBadges,
            owner,
            user1,
            user2,
            user3,
            user4,
            user5,
        };
    }

    describe("ReputationNFT", function () {
        it("Should mint reputation NFT with initial score", async function () {
            const { reputationNFT, owner, user1 } = await loadFixture(deployContractsFixture);

            await reputationNFT.mint(user1.address);
            const score = await reputationNFT.getReputationScore(user1.address);

            expect(score).to.equal(100); // Starting score
        });

        it("Should update reputation score", async function () {
            const { reputationNFT, owner, user1 } = await loadFixture(deployContractsFixture);

            await reputationNFT.mint(user1.address);

            // Authorize owner for test purposes
            await reputationNFT.setAuthorizedUpdater(owner.address, true);

            // Update reputation
            await reputationNFT.updateReputation(user1.address, 50);

            const score = await reputationNFT.getReputationScore(user1.address);
            expect(score).to.equal(150);
        });

        it("Should prevent NFT transfer (soulbound)", async function () {
            const { reputationNFT, user1, user2 } = await loadFixture(deployContractsFixture);

            await reputationNFT.mint(user1.address);
            const tokenId = await reputationNFT.userToTokenId(user1.address);

            await expect(
                reputationNFT.connect(user1).transferFrom(user1.address, user2.address, tokenId)
            ).to.be.revertedWith("Reputation NFTs are soulbound and cannot be transferred");
        });

        it("Should calculate correct tier based on score", async function () {
            const { reputationNFT, owner, user1 } = await loadFixture(deployContractsFixture);

            await reputationNFT.mint(user1.address);
            await reputationNFT.setAuthorizedUpdater(owner.address, true);
            await reputationNFT.updateReputation(user1.address, 850); // Total 950 = Diamond

            const data = await reputationNFT.getReputationData(user1.address);
            expect(data.currentTier).to.equal(4); // Diamond
        });
    });

    describe("TrustCircle", function () {
        it("Should create a trust circle", async function () {
            const { trustCircle, reputationNFT, owner, user1 } = await loadFixture(deployContractsFixture);

            // Mint and boost reputation to 200
            await reputationNFT.mint(user1.address);
            await reputationNFT.setAuthorizedUpdater(owner.address, true);
            await reputationNFT.updateReputation(user1.address, 100);

            await trustCircle.connect(user1).createCircle("Test Circle", 100);

            const members = await trustCircle.getCircleMembers(1);
            expect(members.length).to.equal(1);
            expect(members[0]).to.equal(user1.address);
        });

        it("Should invite and accept members", async function () {
            const { trustCircle, reputationNFT, owner, user1, user2 } = await loadFixture(deployContractsFixture);

            // Setup
            await reputationNFT.mint(user1.address);
            await reputationNFT.setAuthorizedUpdater(owner.address, true);
            await reputationNFT.updateReputation(user1.address, 100);
            await reputationNFT.mint(user2.address);

            await trustCircle.connect(user1).createCircle("Test Circle", 50);

            // Invite and accept
            await trustCircle.connect(user1).inviteMember(1, user2.address);
            await trustCircle.connect(user2).acceptInvitation(1);

            const members = await trustCircle.getCircleMembers(1);
            expect(members.length).to.equal(2);
        });

        it("Should allow vouching for members", async function () {
            const { trustCircle, reputationNFT, owner, user1, user2 } = await loadFixture(deployContractsFixture);

            // Setup
            await reputationNFT.mint(user1.address);
            await reputationNFT.setAuthorizedUpdater(owner.address, true);
            await reputationNFT.updateReputation(user1.address, 100);
            await reputationNFT.mint(user2.address);

            await trustCircle.connect(user1).createCircle("Test Circle", 50);
            await trustCircle.connect(user1).inviteMember(1, user2.address);
            await trustCircle.connect(user2).acceptInvitation(1);

            // Vouch
            await trustCircle.connect(user1).vouchForMember(1, user2.address);

            const vouches = await trustCircle.getVouches(1, user2.address);
            expect(vouches.length).to.equal(1);
            expect(vouches[0]).to.equal(user1.address);
        });
    });

    describe("LendingPool", function () {
        it("Should allow liquidity deposit", async function () {
            const { lendingPool, user1 } = await loadFixture(deployContractsFixture);

            const amount = ethers.parseEther("1");
            await lendingPool.connect(user1).deposit({ value: amount });

            const lenderInfo = await lendingPool.lenders(user1.address);
            expect(lenderInfo.deposited).to.equal(amount);
            expect(await lendingPool.totalLiquidity()).to.equal(amount);
        });

        it("Should allow borrowing with reputation", async function () {
            const { lendingPool, reputationNFT, owner, user1, user2 } = await loadFixture(deployContractsFixture);

            // User1 deposits liquidity
            await lendingPool.connect(user1).deposit({ value: ethers.parseEther("5") });

            // User2 gets reputation and borrows
            await reputationNFT.mint(user2.address);
            await reputationNFT.setAuthorizedUpdater(owner.address, true);
            await reputationNFT.updateReputation(user2.address, 400); // Total 500 = Gold

            const borrowAmount = ethers.parseEther("0.1");
            await lendingPool.connect(user2).borrow(borrowAmount, 30); // 30 days

            const loans = await lendingPool.getBorrowerLoans(user2.address);
            expect(loans.length).to.equal(1);
        });

        it("Should calculate interest rate based on reputation", async function () {
            const { lendingPool, reputationNFT, owner, user1 } = await loadFixture(deployContractsFixture);

            await reputationNFT.mint(user1.address);
            await reputationNFT.setAuthorizedUpdater(owner.address, true);
            await reputationNFT.updateReputation(user1.address, 700); // Total 800 = Platinum

            const rate = await lendingPool.getInterestRate(user1.address);
            expect(rate).to.be.lessThan(1000); // Better than 10% base rate
        });

        it("Should allow loan repayment", async function () {
            const { lendingPool, reputationNFT, owner, user1, user2 } = await loadFixture(deployContractsFixture);

            // Setup: deposit and borrow
            await lendingPool.connect(user1).deposit({ value: ethers.parseEther("5") });
            await reputationNFT.mint(user2.address);
            await reputationNFT.setAuthorizedUpdater(owner.address, true);
            await reputationNFT.updateReputation(user2.address, 400);

            const borrowAmount = ethers.parseEther("0.1");
            await lendingPool.connect(user2).borrow(borrowAmount, 30);

            // Repay
            const totalOwed = await lendingPool.getTotalOwed(1);
            await lendingPool.connect(user2).repay(1, { value: totalOwed });

            const loan = await lendingPool.getLoan(1);
            expect(loan.active).to.be.false;
        });

        it("Should calculate borrowing limit based on reputation and trust", async function () {
            const { lendingPool, reputationNFT, trustCircle, owner, user1, user2, user3 } =
                await loadFixture(deployContractsFixture);

            // Setup user1 with reputation and trust circle
            await reputationNFT.mint(user1.address);
            await reputationNFT.setAuthorizedUpdater(owner.address, true);
            await reputationNFT.updateReputation(user1.address, 400); // 500 total

            await trustCircle.connect(user1).createCircle("Test", 50);

            // Add another member for vouches
            await reputationNFT.mint(user2.address);
            await reputationNFT.setAuthorizedUpdater(owner.address, true);
            await reputationNFT.updateReputation(user2.address, 100);
            await trustCircle.connect(user1).inviteMember(1, user2.address);
            await trustCircle.connect(user2).acceptInvitation(1);
            await trustCircle.connect(user2).vouchForMember(1, user1.address);

            const limit = await lendingPool.getBorrowingLimit(user1.address);
            expect(limit).to.be.greaterThan(0);
        });
    });

    describe("AchievementBadges", function () {
        it("Should unlock achievement and award reputation", async function () {
            const { achievementBadges, reputationNFT, owner, user1 } = await loadFixture(deployContractsFixture);

            await reputationNFT.mint(user1.address);
            const scoreBefore = await reputationNFT.getReputationScore(user1.address);

            // Unlock FirstLoan achievement (20 reputation bonus)
            await achievementBadges.unlockAchievement(user1.address, 0); // AchievementType.FirstLoan

            const scoreAfter = await reputationNFT.getReputationScore(user1.address);
            expect(scoreAfter).to.equal(scoreBefore + BigInt(20));

            const hasAchievement = await achievementBadges.checkAchievement(user1.address, 0);
            expect(hasAchievement).to.be.true;
        });

        it("Should prevent duplicate achievement unlocks", async function () {
            const { achievementBadges, reputationNFT, user1 } = await loadFixture(deployContractsFixture);

            await reputationNFT.mint(user1.address);
            await achievementBadges.unlockAchievement(user1.address, 0);

            await expect(
                achievementBadges.unlockAchievement(user1.address, 0)
            ).to.be.revertedWith("Achievement already unlocked");
        });
    });

    describe("Full User Journey", function () {
        it("Should complete a full lending cycle", async function () {
            const {
                reputationNFT,
                trustCircle,
                lendingPool,
                achievementBadges,
                owner,
                user1,
                user2
            } = await loadFixture(deployContractsFixture);

            // Step 1: User1 deposits liquidity
            await lendingPool.connect(user1).deposit({ value: ethers.parseEther("10") });

            // Step 2: User2 mints reputation NFT
            await reputationNFT.mint(user2.address);
            let reputation = await reputationNFT.getReputationScore(user2.address);
            expect(reputation).to.equal(100);

            // Step 3: User2 boosts reputation to be able to create circle
            await reputationNFT.setAuthorizedUpdater(owner.address, true);
            await reputationNFT.updateReputation(user2.address, 100);

            // Step 4: User2 creates trust circle
            await trustCircle.connect(user2).createCircle("My Circle", 50);

            // Step 5: User2 borrows
            const borrowAmount = ethers.parseEther("0.2");
            await lendingPool.connect(user2).borrow(borrowAmount, 30);

            reputation = await reputationNFT.getReputationScore(user2.address);
            expect(reputation).to.be.greaterThanOrEqual(200); // Reputation may increase

            // Step 6: User2 repays loan
            const totalOwed = await lendingPool.getTotalOwed(1);
            await lendingPool.connect(user2).repay(1, { value: totalOwed });

            // Check final reputation
            reputation = await reputationNFT.getReputationScore(user2.address);
            expect(reputation).to.be.greaterThanOrEqual(250); // Should have bonus for repayment

            // Check loan data recorded
            const repData = await reputationNFT.getReputationData(user2.address);
            expect(repData.loansCompleted).to.equal(1);
        });
    });
});
