const {ethers, upgrades} = require("hardhat");

let businessAccount = "0xa641FBBC5bcD92e3B577899700e2D8F70D372C1d";
// OKC Test
let swapFactory = "0x3F51F044Ca5172BAd640E2eB05804fea84ECaBfb";
let usdtAddress = "0xf49c8a3D93Fd9dEEba7A369836292ec724D58348";

async function main() {
    const defaultPayTokens = [usdtAddress];

    // NFT
    this.NFT = await ethers.getContractFactory("NFT");
    this.nft = await upgrades.deployProxy(
        this.NFT,
        [],
        {initializer: false}
    );
    await this.nft.deployed();
    console.log("this.nft is", this.nft.address);
    console.log("nft implementation is", await upgrades.erc1967.getImplementationAddress(this.nft.address));
    console.log("nft admin is", await upgrades.erc1967.getAdminAddress(this.nft.address));

    // BaseInfo
    this.BaseInfo = await ethers.getContractFactory("BaseInfo");
    this.baseInfo = await upgrades.deployProxy(
        this.BaseInfo,
        [businessAccount],
        {initializer: "initialize"}
    );
    await this.baseInfo.deployed();
    console.log("this.baseInfo is", this.baseInfo.address);
    console.log("baseInfo implementation is", await upgrades.erc1967.getImplementationAddress(this.baseInfo.address));
    console.log("baseInfo admin is", await upgrades.erc1967.getAdminAddress(this.baseInfo.address));

    // MysteryBox
    this.MysteryBox = await ethers.getContractFactory("MysteryBox");
    this.mysteryBox = await upgrades.deployProxy(
        this.MysteryBox,
        [
            usdtAddress,
            99
        ],
        {initializer: "initialize"}
    );
    await this.mysteryBox.deployed();
    console.log("this.mysteryBox is", this.mysteryBox.address);
    console.log("mysteryBox implementation is", await upgrades.erc1967.getImplementationAddress(this.mysteryBox.address));
    console.log("mysteryBox admin is", await upgrades.erc1967.getAdminAddress(this.mysteryBox.address));

    // OracleV2
    this.Oracle = await ethers.getContractFactory("OracleV2");
    this.oracle = await upgrades.deployProxy(
        this.Oracle,
        [swapFactory],
        {initializer: "initialize"}
    );
    await this.oracle.deployed();
    console.log("this.oracle is", this.oracle.address);
    console.log("oracle implementation is", await upgrades.erc1967.getImplementationAddress(this.oracle.address));
    console.log("oracle admin is", await upgrades.erc1967.getAdminAddress(this.oracle.address));

    // MysteryBoxMarket
    this.MysteryBoxMarket = await ethers.getContractFactory("MysteryBoxMarket");
    this.mysteryBoxMarket = await upgrades.deployProxy(
        this.MysteryBoxMarket,
        [
            this.nft.address,
            this.baseInfo.address,
            this.mysteryBox.address,
            this.oracle.address,
            defaultPayTokens
        ],
        {initializer: "initialize"}
    );
    await this.mysteryBoxMarket.deployed();
    console.log("this.mysteryBoxMarket is", this.mysteryBoxMarket.address);
    console.log("mysteryBoxMarket implementation is", await upgrades.erc1967.getImplementationAddress(this.mysteryBoxMarket.address));
    console.log("mysteryBoxMarket admin is", await upgrades.erc1967.getAdminAddress(this.mysteryBoxMarket.address));

    // Set MysteryBox Internal
    await this.mysteryBox.setInternal(this.nft.address, true);
    await this.mysteryBox.setInternal(this.mysteryBoxMarket.address, true);

    // NFTSalesMarket
    this.NFTSalesMarket = await ethers.getContractFactory("NFTSalesMarket");
    this.nftSalesMarket = await upgrades.deployProxy(
        this.NFTSalesMarket,
        [
            this.nft.address,
            this.baseInfo.address,
            this.oracle.address,
            defaultPayTokens
        ],
        {initializer: "initialize"}
    );
    await this.nftSalesMarket.deployed();
    console.log("this.nftSalesMarket is", this.nftSalesMarket.address);
    console.log("nftSalesMarket implementation is", await upgrades.erc1967.getImplementationAddress(this.nftSalesMarket.address));
    console.log("nftSalesMarket admin is", await upgrades.erc1967.getAdminAddress(this.nftSalesMarket.address));

    // Set NFTSalesMarket Internal
    await this.nftSalesMarket.setInternal(this.nft.address, true);

    // NFTStake
    this.NFTStake = await ethers.getContractFactory("NFTStake");
    this.nftStake = await upgrades.deployProxy(
        this.NFTStake,
        [this.nft.address],
        {initializer: "initialize"}
    );
    await this.nftStake.deployed();
    console.log("this.nftStake is", this.nftStake.address);
    console.log("nftStake implementation is", await upgrades.erc1967.getImplementationAddress(this.nftStake.address));
    console.log("nftStake admin is", await upgrades.erc1967.getAdminAddress(this.nftStake.address));

    // UserTokens
    this.UserTokens = await ethers.getContractFactory("UserTokens");
    this.userTokens = await upgrades.deployProxy(
        this.UserTokens,
        [this.nft.address],
        {initializer: "initialize"}
    );
    await this.userTokens.deployed();
    console.log("this.userTokens is", this.userTokens.address);
    console.log("userTokens implementation is", await upgrades.erc1967.getImplementationAddress(this.userTokens.address));
    console.log("userTokens admin is", await upgrades.erc1967.getAdminAddress(this.userTokens.address));

    // Set UserTokens Internal
    await this.userTokens.setInternal(this.nft.address, true);

    // Initialize NFT
    await this.nft.initialize(
        this.baseInfo.address,
        this.mysteryBox.address,
        this.nftSalesMarket.address,
        this.userTokens.address,
        this.mysteryBoxMarket.address
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
