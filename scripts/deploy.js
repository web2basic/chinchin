const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying TrustCircle contracts...\n");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString(), "\n");

    // Deploy ReputationNFT
    console.log("📝 Deploying ReputationNFT...");
    const ReputationNFT = await hre.ethers.getContractFactory("ReputationNFT");
    const reputationNFT = await ReputationNFT.deploy();
    await reputationNFT.waitForDeployment();
    const reputationNFTAddress = await reputationNFT.getAddress();
    console.log("✅ ReputationNFT deployed to:", reputationNFTAddress, "\n");

    // Deploy TrustCircle
    console.log("📝 Deploying TrustCircle...");
    const TrustCircle = await hre.ethers.getContractFactory("TrustCircle");
    const trustCircle = await TrustCircle.deploy(reputationNFTAddress);
    await trustCircle.waitForDeployment();
    const trustCircleAddress = await trustCircle.getAddress();
    console.log("✅ TrustCircle deployed to:", trustCircleAddress, "\n");

    // Deploy LendingPool
    console.log("📝 Deploying LendingPool...");
    const LendingPool = await hre.ethers.getContractFactory("LendingPool");
    const lendingPool = await LendingPool.deploy(reputationNFTAddress, trustCircleAddress);
    await lendingPool.waitForDeployment();
    const lendingPoolAddress = await lendingPool.getAddress();
    console.log("✅ LendingPool deployed to:", lendingPoolAddress, "\n");

    // Deploy AchievementBadges
    console.log("📝 Deploying AchievementBadges...");
    const AchievementBadges = await hre.ethers.getContractFactory("AchievementBadges");
    const achievementBadges = await AchievementBadges.deploy(reputationNFTAddress);
    await achievementBadges.waitForDeployment();
    const achievementBadgesAddress = await achievementBadges.getAddress();
    console.log("✅ AchievementBadges deployed to:", achievementBadgesAddress, "\n");

    // Set up permissions
    console.log("🔐 Setting up permissions...");

    // Authorize LendingPool to update reputation
    await reputationNFT.setAuthorizedUpdater(lendingPoolAddress, true);
    console.log("✅ LendingPool authorized to update reputation");

    // Authorize TrustCircle to update reputation
    await reputationNFT.setAuthorizedUpdater(trustCircleAddress, true);
    console.log("✅ TrustCircle authorized to update reputation");

    // Authorize AchievementBadges to update reputation
    await reputationNFT.setAuthorizedUpdater(achievementBadgesAddress, true);
    console.log("✅ AchievementBadges authorized to update reputation\n");

    // Save deployment addresses
    const deployment = {
        network: hre.network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            ReputationNFT: reputationNFTAddress,
            TrustCircle: trustCircleAddress,
            LendingPool: lendingPoolAddress,
            AchievementBadges: achievementBadgesAddress,
        },
    };

    console.log("📦 Deployment Summary:");
    console.log(JSON.stringify(deployment, null, 2));

    const fs = require("fs");
    const path = require("path");

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    // Save deployment info
    const deploymentPath = path.join(deploymentsDir, `${hre.network.name}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

    console.log("\n✨ Deployment complete! ✨");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
