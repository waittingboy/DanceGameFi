const {ethers} = require("hardhat");
const { expect } = require("chai");
const { BigNumber } = ethers;
const {BN} = require('@openzeppelin/test-helpers');
const { time,ADDRESS_ZERO } = require("./utilities")
const { FakeContract, smock } = require("@defi-wonderland/smock");

async function withDecimals(amount) {
    return new BN(amount).mul(new BN(10).pow(new BN(18))).toString();
}


function encodeParameters() {
    var nftData = {
        "nextAssignId":1000,
        "rang":[
            {"start":1,"end":10}
        ]
    }
    return nftData;
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
        this.BaseInfo = await ethers.getContractFactory("BaseInfo");
        // this.baseInfo = this.signers[6];
        // this._mysteryBox = this.signers[7];
        this.MysteryBox = await ethers.getContractFactory("MysteryBox");
        this.UserTokens = await ethers.getContractFactory("UserTokens");

        // this.mysteryBoxMarket = await smock.fake('MysteryBoxMarket');
        this.OracleV2Mock = await smock.fake('OracleV2');
        this.MysteryBoxMarket = await ethers.getContractFactory("MysteryBoxMarketMock");
        this.NFTSalesMarket = await ethers.getContractFactory("NFTSalesMarketMock");
        this.NFT = await ethers.getContractFactory("NFT");
        this.ERC20Smart = await ethers.getContractFactory("ERC20Mock");

    })

    beforeEach(async function (){
        this.baseInfo = await this.BaseInfo.deploy();
		await this.baseInfo.deployed();
        await this.baseInfo.initialize(user.address);
        this.mysteryBox = await this.MysteryBox.deploy();
		await this.mysteryBox.deployed();
        // var price = withDecimals(1);
        // await this.mysteryBox.initialize(price);

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
        var price = withDecimals(1);
        await this.mysteryBox.initialize(this.elc.address,price);

        var amount = 100;
        var quantity = 20;
        let token20sAddress = [this.usdc.address,this.elc.address];
        await this.mysteryBoxMarket.initialize(this.nft.address,this.baseInfo.address,this.mysteryBox.address,this.OracleV2Mock.address,token20sAddress);
        await this.mysteryBox.setInternal(owner.address,true);
        await this.mysteryBox.setInternal(this.mysteryBoxMarket.address,true);
        await this.mysteryBox.setInternal(this.nft.address,true);
        await this.baseInfo.setInternal(this.nft.address,true);
        // function initialize(INFT _internalToken, IBaseInfo _baseInfo, IOracle _oracle, address[] memory _token20sAddress) public initializer {
        await this.nftSalesMarket.initialize(this.nft.address,this.baseInfo.address,this.OracleV2Mock.address,token20sAddress);
        await this.nftSalesMarket.setInternal(owner.address,true);
        await this.nftSalesMarket.setInternal(this.nft.address,true);
        await this.mysteryBox.setInternal(owner.address,true);
        await this.mysteryBox.setInternal(this.nftSalesMarket.address,true);
        await this.mysteryBox.setInternal(this.nft.address,true);
        await this.baseInfo.setInternal(this.nft.address,true);
    });

    it("test initialize", async function() {
        var isUsdcDefault = await this.nftSalesMarket.isDefaultToken(this.usdc.address);
        expect(isUsdcDefault).to.equal(true);
        var isElcDefault = await this.nftSalesMarket.isDefaultToken(this.elc.address);
        expect(isElcDefault).to.equal(true);
        var isHnqTokenDefault = await this.nftSalesMarket.isDefaultToken(this.hnqToken.address);
        expect(isHnqTokenDefault).to.equal(false);
        let supportTokenQuantity = await this.nftSalesMarket.getSupportTokenQuantity();
        expect(supportTokenQuantity).to.equal(2);
        var isUsdcSupport = await this.nftSalesMarket.isSupportToken(this.usdc.address);
        expect(isUsdcSupport).to.equal(true);
        var isElcSupport = await this.nftSalesMarket.isSupportToken(this.elc.address);
        expect(isElcSupport).to.equal(true);
        var isHnqTokenSupport = await this.nftSalesMarket.isSupportToken(this.hnqToken.address);
        expect(isHnqTokenSupport).to.equal(false);
        var isAdmin = await this.nftSalesMarket.getIsAdmin(owner.address);
        expect(isAdmin).to.equal(true);
        var isAdmin = await this.nftSalesMarket.getIsAdmin(user.address);
        expect(isAdmin).to.equal(false);
        var internalToken = await this.nftSalesMarket.internalToken();
        expect(internalToken).to.equal(this.nft.address);
        var baseInfo = await this.nftSalesMarket.baseInfo();
        expect(baseInfo).to.equal(this.baseInfo.address);
        // var mysteryBox = await this.nftSalesMarket.mysteryBox();
        // expect(mysteryBox).to.equal(this.mysteryBox.address);
        // var maxOpenQuantity = await this.nftSalesMarket.getMaxOpenQuantity();
        // expect(maxOpenQuantity).to.equal(10);
    });

    it("test addNFTs", async function() {
        let propId =3;
        // data.isOpenSale, data.price, data.remainedQuantity, data.unsoldQuantity
        var data =await this.nftSalesMarket.getNFTData(propId);
        expect(data[0]).to.equal(false);
        expect(data[1]).to.equal('0x0000000000000000000000000000000000000000');
        expect(data[2]).to.equal(0);
        expect(data[3]).to.equal(0);
        expect(data[4]).to.equal(0);
        var propIds = this.nftSalesMarket.getNFTPropIds();
        // expect(propIds.length).equal(0);
        // uint _propId, uint _quantity, uint _startTokenId
        await expect(this.nftSalesMarket.connect(bob).addNFTs(propId,10,0,{from:bob.address})).revertedWith("caller is not internal caller");
        await expect(this.nftSalesMarket.addNFTs(propId,10,0)).revertedWith("start token id is error");
        await this.nftSalesMarket.addNFTs(propId,10,1);
        var data =await this.nftSalesMarket.getNFTData(propId);
        expect(data[0]).to.equal(false);
        expect(data[1]).to.equal('0x0000000000000000000000000000000000000000');
        expect(data[2]).to.equal(0);
        expect(data[3]).to.equal(10);
        expect(data[4]).to.equal(0);
        var propIds =await this.nftSalesMarket.getNFTPropIds();
        console.log("propIds is:",propIds);
        expect(propIds.length).equal(1);
        await expect(this.nftSalesMarket.connect(user).setNFTBaseTokenData(propId,this.elc.address,100,{from:user.address})).revertedWith("caller is not admin");
        await expect(this.nftSalesMarket.setNFTBaseTokenData(1,this.elc.address,100)).revertedWith("NFT not exist");
        await this.nftSalesMarket.setNFTBaseTokenData(propId,this.elc.address,100);
        var data =await this.nftSalesMarket.getNFTData(propId);
        expect(data[0]).to.equal(false);
        expect(data[1]).to.equal(this.elc.address);
        expect(data[2]).to.equal(100);
        expect(data[3]).to.equal(10);
        expect(data[4]).to.equal(0);
        await expect(this.nftSalesMarket.setNFTBaseTokenData(1,this.elc.address,10)).revertedWith("NFT not exist");
        await expect(this.nftSalesMarket.addNFTs(propId,10,9)).revertedWith("start token id is error");
        await this.nftSalesMarket.addNFTs(propId,10,12);
        var data =await this.nftSalesMarket.getNFTData(propId);
        expect(data[0]).to.equal(false);
        expect(data[1]).to.equal(this.elc.address);
        expect(data[2]).to.equal(100);
        expect(data[3]).to.equal(20);
        expect(data[4]).to.equal(0);
    });

    it("test openNFTSale", async function() {
        let propId =3;
        // data.isOpenSale, data.price, data.remainedQuantity, data.unsoldQuantity
        await this.nftSalesMarket.addNFTs(propId,10,1);
        var data =await this.nftSalesMarket.getNFTData(propId);
        var propIds =await this.nftSalesMarket.getNFTPropIds();
        expect(propIds.length).equal(1);
        await expect(this.nftSalesMarket.openNFTSale(propId,10)).revertedWith("NFT not set price");
        await this.nftSalesMarket.setNFTBaseTokenData(propId,this.elc.address,100);
        var data =await this.nftSalesMarket.getNFTData(propId);
        expect(data[0]).to.equal(false);
        expect(data[1]).to.equal(this.elc.address);
        expect(data[2]).to.equal(100);
        expect(data[3]).to.equal(10);
        expect(data[4]).to.equal(0);
        await expect(this.nftSalesMarket.openNFTSale(propId,11)).revertedWith("quantity is zero or greater than remained quantity");
        await this.nftSalesMarket.openNFTSale(propId,8);
        await expect(this.nftSalesMarket.openNFTSale(propId,8)).revertedWith("NFT is open sale");
        await expect(this.nftSalesMarket.openNFTSale(1,10)).revertedWith("NFT not exist");
        var data =await this.nftSalesMarket.getNFTData(propId);
        expect(data[0]).to.equal(true);
        expect(data[1]).to.equal(this.elc.address);
        expect(data[2]).to.equal(100);
        expect(data[3]).to.equal(10);
        expect(data[4]).to.equal(8);
    });

    it("test closeNFTSale", async function() {
        let propId =3;
        // data.isOpenSale, data.price, data.remainedQuantity, data.unsoldQuantity
        await this.nftSalesMarket.addNFTs(propId,10,1);
        var data =await this.nftSalesMarket.getNFTData(propId);
        var propIds =await this.nftSalesMarket.getNFTPropIds();
        expect(propIds.length).equal(1);
        await expect(this.nftSalesMarket.openNFTSale(propId,10)).revertedWith("NFT not set price");
        await this.nftSalesMarket.setNFTBaseTokenData(propId,this.elc.address,100);
        var data =await this.nftSalesMarket.getNFTData(propId);
        expect(data[0]).to.equal(false);
        expect(data[1]).to.equal(this.elc.address);
        expect(data[2]).to.equal(100);
        expect(data[3]).to.equal(10);
        expect(data[4]).to.equal(0);
        await expect(this.nftSalesMarket.openNFTSale(propId,11)).revertedWith("quantity is zero or greater than remained quantity");
        await this.nftSalesMarket.openNFTSale(propId,8);
        await expect(this.nftSalesMarket.openNFTSale(propId,8)).revertedWith("NFT is open sale");
        await expect(this.nftSalesMarket.openNFTSale(1,10)).revertedWith("NFT not exist");
        var data =await this.nftSalesMarket.getNFTData(propId);
        expect(data[0]).to.equal(true);
        expect(data[1]).to.equal(this.elc.address);
        expect(data[2]).to.equal(100);
        expect(data[3]).to.equal(10);
        expect(data[4]).to.equal(8);
        await expect(this.nftSalesMarket.closeNFTSale(1)).revertedWith("NFT not exist");

        await this.nftSalesMarket.closeNFTSale(3);
        var data =await this.nftSalesMarket.getNFTData(propId);
        // data.isOpenSale, data.price, data.remainedQuantity, data.unsoldQuantity
        expect(data[0]).to.equal(false);
        expect(data[1]).to.equal(this.elc.address);
        expect(data[2]).to.equal(100);
        expect(data[3]).to.equal(10);
        expect(data[4]).to.equal(0);
    });


    it("test buyNFT", async function() {
        let propId =3;
        await this.OracleV2Mock.getPayAmount.returns(100);
        await expect(this.nftSalesMarket.buyNFT(propId,5,this.usdt.address,100)).revertedWith("not in support tokens");
        await expect(this.nftSalesMarket.buyNFT(propId,0,this.usdc.address,100)).revertedWith("quantity is zero or greater than unsold quantity");
        await expect(this.nftSalesMarket.buyNFT(propId,100,this.usdc.address,100)).revertedWith("quantity is zero or greater than unsold quantity");
        
        await this.usdc.mint(owner.address,withDecimals(1000));
        await this.usdc.approve(this.nftSalesMarket.address,withDecimals(1000));
        await this.elc.mint(owner.address,withDecimals(1000));
        await this.elc.approve(this.nftSalesMarket.address,withDecimals(1000));
        
        await this.nft.mint(propId,"ttt",10,3);
        await this.nftSalesMarket.setNFTBaseTokenData(propId,this.elc.address,100);
        await this.nftSalesMarket.openNFTSale(propId,8);
        await expect(this.nftSalesMarket.buyNFT(propId,5,this.usdc.address,3)).revertedWith("amount is not enough");
        var tx = await this.nftSalesMarket.buyNFT(propId,5,this.usdc.address,100);
        
        let balanceOfUser =await this.usdc.balanceOf(user.address);
        expect(balanceOfUser).to.equal(100);
        var data =await this.nftSalesMarket.getNFTData(propId);
        // data.isOpenSale, data.price, data.remainedQuantity, data.unsoldQuantity
        expect(data[0]).to.equal(true);
        expect(data[1]).to.equal(this.elc.address);
        expect(data[2]).to.equal(100);
        expect(data[3]).to.equal(5);
        expect(data[4]).to.equal(3);
        let receipt = await tx.wait()
        let nftSold = receipt.events.pop()
        expect(nftSold.event).to.be.equal("NFTSold");
        expect(nftSold.eventSignature).to.be.equal("NFTSold(address,uint256,uint256)");
        var eventPropId = nftSold.args[1];
        expect(eventPropId).to.equal(propId);
        var quantity = nftSold.args[2];
        expect(quantity).to.equal(5);
        console.log(5);
        await expect(this.nftSalesMarket.buyNFT(propId,2,this.elc.address,100)).revertedWith("amount is not equal");
        await this.nftSalesMarket.buyNFT(propId,2,this.elc.address,200);
    });

    it("test getNextAssignId", async function() {
        let propId =1;
        await this.OracleV2Mock.getPayAmount.returns(100);
        
        await this.usdc.mint(owner.address,withDecimals(1000));
        await this.usdc.approve(this.nftSalesMarket.address,withDecimals(1000));
        await this.elc.mint(owner.address,withDecimals(1000));
        await this.elc.approve(this.nftSalesMarket.address,withDecimals(1000));
        
        await this.nft.mint(propId,"ttt",8,3);
        await this.nftSalesMarket.setNFTBaseTokenData(propId,this.elc.address,100);
        await this.nftSalesMarket.openNFTSale(propId,8);
        var tx = await this.nftSalesMarket.buyNFT(propId,5,this.usdc.address,100);
        await this.nftSalesMarket.buyNFT(propId,3,this.elc.address,300);
        await this.nft.mint(1,"ttt3",5,3);
        await this.nft.mint(1,"ttt3",5,3);
        await this.nftSalesMarket.closeNFTSale(1);
        await this.nftSalesMarket.openNFTSale(1,5);
        await this.nftSalesMarket.closeNFTSale(1);
        await this.nftSalesMarket.openNFTSale(1,10);
        await this.nftSalesMarket.buyNFT(1,6,this.elc.address,600);
    });

})
