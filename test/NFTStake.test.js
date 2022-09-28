const {ethers} = require("hardhat")
const { expect } = require("chai")
const { BigNumber } = ethers
const { ADDRESS_ZERO } = require("./utilities")

describe("NFTStake contract test", async function() {
    before(async function() {
        this.signers = await ethers.getSigners()
        owner = this.signers[0]
        user = this.signers[1]
        alice = this.signers[2]

        this.UserToken = await ethers.getContractFactory("UserTokens")
        this.TOKEN1155 = await ethers.getContractFactory("NFT")
        this.BaseInfo = await ethers.getContractFactory("BaseInfo")
        this.MysteryBox = await ethers.getContractFactory("MysteryBox")
        this.SalesMarket = await ethers.getContractFactory("NFTSalesMarket")
        this.Token20 = await ethers.getContractFactory("ERC20Mock")
		this.Stake = await ethers.getContractFactory("NFTStakeMock")
    })

    beforeEach(async function() {
        userTokens = await this.UserToken.deploy()
        await userTokens.deployed()

        token1155 = await this.TOKEN1155.deploy()
        await token1155.deployed()

        base = await this.BaseInfo.deploy()
        await base.deployed()

        mysteryBox = await this.MysteryBox.deploy()
        await mysteryBox.deployed()

        salesMarket = await this.SalesMarket.deploy()
        await salesMarket.deployed()

        token20 = await this.Token20.deploy("ERC20", "Token20")
        await token20.deployed()

		sta = await this.Stake.deploy()
		await sta.deployed()
    })

    it("initialize", async function() {
        // initialize
        await sta.initialize(token1155.address)
        // expect result
        expect(await sta.internalToken()).to.be.equal(token1155.address)
    })

    describe("NFTStake functions test", async function() {
        beforeEach(async function() {
            await userTokens.initialize(token1155.address)
            await userTokens.setInternal(token1155.address, true)
            await base.initialize(owner.address)  // set owner as _businessAccount
            await base.setInternal(token1155.address, true)
            await mysteryBox.initialize(owner.address, 1000)
            await mysteryBox.setInternal(token1155.address, true)
            _token20Addrs = [token20.address]
            await salesMarket.initialize(token1155.address, base.address, user.address, _token20Addrs)
            await salesMarket.setInternal(token1155.address, true)
            await token1155.initialize(
                base.address, mysteryBox.address, salesMarket.address,
                userTokens.address, user.address
            )
            await sta.initialize(token1155.address)
            _propId = 1, _uri = "testUri", _quantity = 2, _type = 1
            await token1155.mint(_propId, _uri, _quantity, _type)
        })

        it("stake succeed", async function() {
            // pre state
            _propIdOffset = BigNumber.from(2).pow(128).mul(_propId)
            _tokenIds = [BigNumber.from(1).add(_propIdOffset), BigNumber.from(2).add(_propIdOffset)]
            eptTokenIds = await sta.getUserStakedNFTs(owner.address)
            expect(eptTokenIds.length).to.be.equal(0)
            expect(await token1155.balanceOf(owner.address, _tokenIds[0])).to.be.equal(1)
            expect(await token1155.balanceOf(owner.address, _tokenIds[1])).to.be.equal(1)

            // do call
            await token1155.setApprovalForAll(sta.address, true)
            await sta.stake(_tokenIds)
            // expect result
            eptTokenIds = await sta.getUserStakedNFTs(owner.address)
            expect(eptTokenIds.length).to.be.equal(2)
            expect(eptTokenIds[0]).to.be.equal(_tokenIds[0])
            expect(eptTokenIds[1]).to.be.equal(_tokenIds[1])
            expect(await sta.getUserStakedTokenIdIndex(owner.address, _tokenIds[0])).to.be.equal(1)
            expect(await sta.getUserStakedTokenIdIndex(owner.address, _tokenIds[1])).to.be.equal(2)
            expect(await token1155.balanceOf(owner.address, _tokenIds[0])).to.be.equal(0)
            expect(await token1155.balanceOf(owner.address, _tokenIds[1])).to.be.equal(0)
            expect(await token1155.balanceOf(sta.address, _tokenIds[0])).to.be.equal(1)
            expect(await token1155.balanceOf(sta.address, _tokenIds[1])).to.be.equal(1)
        })

        it("stake failed in all cases", async function() {
            // nft balance is zero
            await expect(sta.stake([3])).to.be.revertedWith("nft balance is zero")

            // not approve
            _propIdOffset = BigNumber.from(2).pow(128).mul(_propId)
            _tokenIds = [BigNumber.from(1).add(_propIdOffset), BigNumber.from(2).add(_propIdOffset)]
            await expect(sta.stake(_tokenIds)).to.be.revertedWith("transfer not approved")
        })

        it("cancelAllStake succeed", async function() {
            // pre state
            _propIdOffset = BigNumber.from(2).pow(128).mul(_propId)
            _tokenIds = [BigNumber.from(1).add(_propIdOffset), BigNumber.from(2).add(_propIdOffset)]
            await token1155.setApprovalForAll(sta.address, true)
            await sta.stake(_tokenIds)

            // do call
            await sta.cancelAllStake()
            // expect result
            eptTokenIds = await sta.getUserStakedNFTs(owner.address)
            expect(eptTokenIds.length).to.be.equal(0)
            expect(await sta.getUserStakedTokenIdIndex(owner.address, _tokenIds[0])).to.be.equal(0)
            expect(await sta.getUserStakedTokenIdIndex(owner.address, _tokenIds[1])).to.be.equal(0)
            expect(await token1155.balanceOf(owner.address, _tokenIds[0])).to.be.equal(1)
            expect(await token1155.balanceOf(owner.address, _tokenIds[1])).to.be.equal(1)
            expect(await token1155.balanceOf(sta.address, _tokenIds[0])).to.be.equal(0)
            expect(await token1155.balanceOf(sta.address, _tokenIds[1])).to.be.equal(0)
        })

        it("cancelAllStake failed in all cases", async function() {
            // must have staked tokenId
            await expect(sta.cancelAllStake()).to.be.revertedWith("you are not staked NFTs")
        })

        it("cancelStake succeed", async function() {
            // pre state
            _propIdOffset = BigNumber.from(2).pow(128).mul(_propId)
            _tokenIds = [BigNumber.from(1).add(_propIdOffset), BigNumber.from(2).add(_propIdOffset)]
            await token1155.setApprovalForAll(sta.address, true)
            await sta.stake(_tokenIds)
            expect(await sta.getUserStakedTokenIdIndex(owner.address, _tokenIds[0])).to.be.equal(1)
            expect(await sta.getUserStakedTokenIdIndex(owner.address, _tokenIds[1])).to.be.equal(2)

            // do call
            await sta.cancelStake([_tokenIds[0]])
            // expect result
            eptTokenIds = await sta.getUserStakedNFTs(owner.address)
            expect(eptTokenIds.length).to.be.equal(1)
            expect(await sta.getUserStakedTokenIdIndex(owner.address, _tokenIds[0])).to.be.equal(0)
            expect(await sta.getUserStakedTokenIdIndex(owner.address, _tokenIds[1])).to.be.equal(1)
            expect(await token1155.balanceOf(owner.address, _tokenIds[0])).to.be.equal(1)
            expect(await token1155.balanceOf(owner.address, _tokenIds[1])).to.be.equal(0)
            expect(await token1155.balanceOf(sta.address, _tokenIds[0])).to.be.equal(0)
            expect(await token1155.balanceOf(sta.address, _tokenIds[1])).to.be.equal(1)

            // do call again
            await sta.cancelStake([_tokenIds[1]])
            // expect result
            eptTokenIds = await sta.getUserStakedNFTs(owner.address)
            expect(eptTokenIds.length).to.be.equal(0)
            expect(await sta.getUserStakedTokenIdIndex(owner.address, _tokenIds[1])).to.be.equal(0)
            expect(await token1155.balanceOf(owner.address, _tokenIds[0])).to.be.equal(1)
            expect(await token1155.balanceOf(owner.address, _tokenIds[1])).to.be.equal(1)
            expect(await token1155.balanceOf(sta.address, _tokenIds[0])).to.be.equal(0)
            expect(await token1155.balanceOf(sta.address, _tokenIds[1])).to.be.equal(0)
        })

        // it("cancelStake failed in all cases", async function() {
        //     _propIdOffset = BigNumber.from(2).pow(128).mul(_propId)
        //     _tokenIds = [BigNumber.from(1).add(_propIdOffset), BigNumber.from(2).add(_propIdOffset)]
        //     await token1155.setApprovalForAll(sta.address, true)
        //     await sta.stake([_tokenIds[0]])

        //     // must have staked all tokenId
        //     await expect(sta.cancelStake(_tokenIds)).to.be.revertedWith("you are not staked all the NFTs")
        // })

        it("deleteTokenId succeed", async function() {
            // pre state
            _propIdOffset = BigNumber.from(2).pow(128).mul(_propId)
            _tokenIds = [BigNumber.from(1).add(_propIdOffset), BigNumber.from(2).add(_propIdOffset)]
            await token1155.setApprovalForAll(sta.address, true)
            await sta.stake(_tokenIds)
            expect(await sta.getUserNFTStakedState(owner.address, _tokenIds[0])).to.be.equal(true)
            expect(await sta.getUserNFTStakedState(owner.address, _tokenIds[1])).to.be.equal(true)

            // do call
            await sta.deleteTokenId(owner.address, _tokenIds[0])
            eptTokenIds = await sta.getUserStakedNFTs(owner.address)
            expect(eptTokenIds.length).to.be.equal(1)
            expect(await sta.getUserNFTStakedState(owner.address, _tokenIds[0])).to.be.equal(false)
            expect(await sta.getUserNFTStakedState(owner.address, _tokenIds[1])).to.be.equal(true)
            expect(await sta.getUserStakedTokenIdIndex(owner.address, _tokenIds[1])).to.be.equal(1)

            // do call again
            await sta.deleteTokenId(owner.address, _tokenIds[1])
            eptTokenIds = await sta.getUserStakedNFTs(owner.address)
            expect(eptTokenIds.length).to.be.equal(0)
            expect(await sta.getUserNFTStakedState(owner.address, _tokenIds[1])).to.be.equal(false)
            expect(await sta.getUserStakedTokenIdIndex(owner.address, _tokenIds[1])).to.be.equal(0)
        })

        it("deleteTokenId failed in all cases", async function() {
            // the tokenId's index must GT 0
            await expect(sta.deleteTokenId(owner.address, 1)).to.be.revertedWith("you are not staked all the NFTs")
        })
    })
})
