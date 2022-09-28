const {ethers} = require("hardhat");
const { expect } = require("chai");
const { BigNumber } = ethers;
const {BN} = require('@openzeppelin/test-helpers');
const { time,ADDRESS_ZERO } = require("./utilities")
const { FakeContract, smock } = require("@defi-wonderland/smock");

async function withDecimals(amount) {
    return new BN(amount).mul(new BN(10).pow(new BN(18))).toString();
}

let owner;
let user;
let alice;
let bob;
let cloud;
let _NFTFundAccount;
let _handlingFeeAccount;
describe("MysteryBoxMarket func",function() {
    // this.timeout(300000);
    before(async function () {
        this.signers = await ethers.getSigners()
        owner = this.signers[0]
        user = this.signers[1]
        alice = this.signers[2]
        bob = this.signers[3];
        cloud = this.signers[4];
        this.swapFactory = this.signers[5];
        this.BaseInfo = await ethers.getContractFactory("BaseInfo");
        // this.baseInfo = this.signers[6];
        // this._mysteryBox = this.signers[7];
        this.MysteryBox = await ethers.getContractFactory("MysteryBox");
        this.NFTSalesMarket = await ethers.getContractFactory("NFTSalesMarketMock");
        this.UserTokens = await ethers.getContractFactory("UserTokens");

        this.OracleV2Mock = await smock.fake('OracleV2');
        this.MysteryBoxMarket = await ethers.getContractFactory("MysteryBoxMarketMock");
        this.NFT = await ethers.getContractFactory("NFT");
        this.ERC20Smart = await ethers.getContractFactory("ERC20Mock");
        // this.OracleV2 = await ethers.getContractFactory("OracleV2");
    })

    beforeEach(async function (){
        this.baseInfo = await this.BaseInfo.deploy();
		await this.baseInfo.deployed();
        await this.baseInfo.initialize(user.address);

        this.mysteryBox = await this.MysteryBox.deploy();
		await this.mysteryBox.deployed();
        
        this.mysteryBoxMarket= await this.MysteryBoxMarket.deploy();
        await this.mysteryBoxMarket.deployed();

        this.nftSalesMarket= await this.NFTSalesMarket.deploy();
        await this.nftSalesMarket.deployed();

        this.nft = await this.NFT.deploy();
        await this.nft.deployed();
        this.userTokens = await this.UserTokens.deploy();
        await this.userTokens.deployed();
        await this.userTokens.initialize(this.nft.address);
        await this.userTokens.setInternal(this.nft.address,true);
        // IBaseInfo _baseInfo, IMysteryBox _mysteryBox, INFTSalesMarket _salesMarket, IUserTokens _userTokens, address _mysteryBoxMarketAddress
        await this.nft.initialize(
            this.baseInfo.address,this.mysteryBox.address,this.nftSalesMarket.address,
            this.userTokens.address,this.mysteryBoxMarket.address
            );
        this.pledgeToken = await this.ERC20Smart.deploy("hip token", "hip");
        await this.pledgeToken.deployed()
        this.hnqToken = await this.ERC20Smart.deploy("hnq token", "hnq");
        await this.hnqToken.deployed()
        this.usdc = await this.ERC20Smart.deploy("USDC token", "USDC");
        await this.usdc.deployed();
        this.usdt = await this.ERC20Smart.deploy("USDT token", "USDT");
        await this.usdt.deployed();
        this.dai = await this.ERC20Smart.deploy("dai token", "dai");
        await this.dai.deployed();
        this.elc = await this.ERC20Smart.deploy("ELC token", "ELC");
        await this.elc.deployed();
        var price = 100;
        await this.mysteryBox.initialize(this.elc.address,price);
        
        // this.oracleV2 =await this.OracleV2.deploy();
        // await this.oracleV2.deployed();
        // await this.oracleV2.initialize(this.swapFactory.address);
        // INFT _internalToken, IBaseInfo _baseInfo, IMysteryBox _mysteryBox, IOracle _oracle, address[] memory _token20sAddress
        let token20sAddress = [this.usdc.address,this.elc.address];
        await this.mysteryBoxMarket.initialize(this.nft.address,this.baseInfo.address,this.mysteryBox.address,this.OracleV2Mock.address,token20sAddress);
        await this.mysteryBox.setInternal(owner.address,true);
        await this.mysteryBox.setInternal(this.mysteryBoxMarket.address,true);
        await this.mysteryBox.setInternal(this.nft.address,true);
        await this.baseInfo.setInternal(this.nft.address,true);
    });

    it("test initialize", async function() {
        var isUsdcDefault = await this.mysteryBoxMarket.isDefaultToken(this.usdc.address);
        expect(isUsdcDefault).to.equal(true);
        var isElcDefault = await this.mysteryBoxMarket.isDefaultToken(this.elc.address);
        expect(isElcDefault).to.equal(true);
        var isHnqTokenDefault = await this.mysteryBoxMarket.isDefaultToken(this.hnqToken.address);
        expect(isHnqTokenDefault).to.equal(false);
        let supportTokenQuantity = await this.mysteryBoxMarket.getSupportTokenQuantity();
        expect(supportTokenQuantity).to.equal(2);
        var isUsdcSupport = await this.mysteryBoxMarket.isSupportToken(this.usdc.address);
        expect(isUsdcSupport).to.equal(true);
        var isElcSupport = await this.mysteryBoxMarket.isSupportToken(this.elc.address);
        expect(isElcDefault).to.equal(true);
        var isHnqTokenSupport = await this.mysteryBoxMarket.isSupportToken(this.hnqToken.address);
        expect(isHnqTokenSupport).to.equal(false);
        var isAdmin = await this.mysteryBoxMarket.getIsAdmin(owner.address);
        expect(isAdmin).to.equal(true);
        var isAdmin = await this.mysteryBoxMarket.getIsAdmin(user.address);
        expect(isAdmin).to.equal(false);
        var internalToken = await this.mysteryBoxMarket.internalToken();
        expect(internalToken).to.equal(this.nft.address);
        var baseInfo = await this.mysteryBoxMarket.baseInfo();
        expect(baseInfo).to.equal(this.baseInfo.address);
        var mysteryBox = await this.mysteryBoxMarket.mysteryBox();
        expect(mysteryBox).to.equal(this.mysteryBox.address);
        var maxOpenQuantity = await this.mysteryBoxMarket.getMaxOpenQuantity();
        expect(maxOpenQuantity).to.equal(10);
    });

    it("test adjustMaxOpenQuantity", async function() {
        await expect(this.mysteryBoxMarket.connect(bob).adjustMaxOpenQuantity(100,{from:bob.address})).revertedWith("caller is not admin");
        await expect(this.mysteryBoxMarket.adjustMaxOpenQuantity(0)).revertedWith("quantity is zero");
        var justValue = 100;
        await this.mysteryBoxMarket.adjustMaxOpenQuantity(justValue);
        var maxOpenQuantity = await this.mysteryBoxMarket.getMaxOpenQuantity();
        expect(maxOpenQuantity).to.equal(justValue);
    });

    it("test buyMysteryBox", async function() {
        await expect(this.mysteryBoxMarket.buyMysteryBox(5,this.usdt.address,100)).revertedWith("not in support tokens");
        await expect(this.mysteryBoxMarket.buyMysteryBox(0,this.usdc.address,100)).revertedWith("quantity is zero or greater than unsold quantity");
        await this.usdc.mint(owner.address,withDecimals(1000));
        await this.usdc.approve(this.mysteryBoxMarket.address,withDecimals(1000));

        await this.elc.mint(owner.address,withDecimals(3000));
        await this.elc.approve(this.mysteryBoxMarket.address,withDecimals(3000));

        await this.mysteryBox.addNFTsToBoxPool(1,100,1);
        await expect(this.mysteryBoxMarket.buyMysteryBox(201,this.usdc.address,100)).revertedWith("quantity is zero or greater than unsold quantity");
        var amount = 100;
        var quantity = 20;
        this.OracleV2Mock.getPayAmount.returns(100);
        await expect(this.mysteryBoxMarket.buyMysteryBox(quantity,this.usdc.address,90)).revertedWith("amount is not enough");
        var tx = await this.mysteryBoxMarket.buyMysteryBox(quantity,this.usdc.address,amount);
        var balanceOfBusinessAccount = await this.usdc.balanceOf(user.address);
        expect(balanceOfBusinessAccount).to.equal(amount);
        var UnOpenedQuantity = await this.mysteryBoxMarket.getUnOpenedQuantity(owner.address);
        expect(UnOpenedQuantity).to.equal(quantity);

        let receipt = await tx.wait()
        let mysteryBoxSold = receipt.events.pop()
        expect(mysteryBoxSold.event).to.be.equal("MysteryBoxSold");
        expect(mysteryBoxSold.eventSignature).to.be.equal("MysteryBoxSold(address,uint256)");
        let tokens = mysteryBoxSold.args[1];
        expect(tokens).to.be.equal(20);
        await expect(this.mysteryBoxMarket.buyMysteryBox(quantity,this.elc.address,90)).revertedWith("amount is not equal");
        await this.mysteryBoxMarket.buyMysteryBox(quantity,this.elc.address,2000);
    });

    it("test openMysteryBox", async function() {
        await expect(this.mysteryBoxMarket.buyMysteryBox(5,this.usdt.address,100)).revertedWith("not in support tokens");
        await expect(this.mysteryBoxMarket.buyMysteryBox(0,this.usdc.address,100)).revertedWith("quantity is zero or greater than unsold quantity");
        await this.usdc.mint(owner.address,withDecimals(1000));
        await this.usdc.approve(this.mysteryBoxMarket.address,withDecimals(1000));
        // uint _propId, string memory _uri, uint _quantity, uint _type
        await this.nft.mint(1,"ttt",10,2);
        // await this.mysteryBox.addNFTsToBoxPool(1,100,1);
        await expect(this.mysteryBoxMarket.buyMysteryBox(201,this.usdc.address,100)).revertedWith("quantity is zero or greater than unsold quantity");
        var amount = 100;
        var quantity = 8;
        var tx = await this.mysteryBoxMarket.buyMysteryBox(quantity,this.usdc.address,amount);
        var unOpenedQuantity = await this.mysteryBoxMarket.getUnOpenedQuantity(owner.address);
        expect(unOpenedQuantity).to.equal(quantity);
        
        await expect(this.mysteryBoxMarket.openMysteryBox(0)).revertedWith("quantity is zero or greater than unOpenedQuantity or maxOpenQuantity");
        await expect(this.mysteryBoxMarket.openMysteryBox(11)).revertedWith("quantity is zero or greater than unOpenedQuantity or maxOpenQuantity");
        await expect(this.mysteryBoxMarket.openMysteryBox(20)).revertedWith("quantity is zero or greater than unOpenedQuantity or maxOpenQuantity");
        var openQuantity = 5;
        
        var tx = await this.mysteryBoxMarket.openMysteryBox(openQuantity);
        var unOpenedQuantity = await this.mysteryBoxMarket.getUnOpenedQuantity(owner.address);
        expect(unOpenedQuantity).to.equal(quantity-openQuantity);
        
        let openedNfts = await this.mysteryBoxMarket.getOpenedNFTs(owner.address);
        console.log("openedNfts is:",openedNfts);
        expect(openedNfts.length).to.equal(5);
        expect(openedNfts[0].toString()).to.equal("340282366920938463463374607431768211457");
        let receipt = await tx.wait()
        let mysteryBoxOpened = receipt.events.pop()
        expect(mysteryBoxOpened.event).to.be.equal("MysteryBoxOpened");
        expect(mysteryBoxOpened.eventSignature).to.be.equal("MysteryBoxOpened(address,uint256[])");
        let tokens = mysteryBoxOpened.args[1];
        expect(tokens[0].toString()).to.equal("340282366920938463463374607431768211457");
    });
})
