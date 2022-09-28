const {ethers} = require("hardhat")
const { expect } = require("chai")
const { BigNumber } = ethers
const { ADDRESS_ZERO } = require("./utilities")

let owner, user, alice
let userTokens, token1155, base, mysteryBox, salesMarket

describe("UserTokens contract test", async function() {
    before(async function() {
        this.signers = await ethers.getSigners()
        owner = this.signers[0]
        user = this.signers[1]
        alice = this.signers[2]

        this.UserToken = await ethers.getContractFactory("UserTokensMock")
        this.TOKEN1155 = await ethers.getContractFactory("NFT")
        this.BaseInfo = await ethers.getContractFactory("BaseInfo")
        this.MysteryBox = await ethers.getContractFactory("MysteryBox")
        this.SalesMarket = await ethers.getContractFactory("NFTSalesMarket")
        this.Token20 = await ethers.getContractFactory("ERC20Mock")
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
    })

    it("initialize", async function() {
        // initialize
        await userTokens.initialize(token1155.address)
        // expect result
        expect(await userTokens.internalToken()).to.be.equal(token1155.address)
    })

    describe("UserTokens functions test", async function() {
        beforeEach(async function() {
            await userTokens.initialize(token1155.address)
            await userTokens.setInternal(owner.address, true)
            await userTokens.setInternal(token1155.address, true)
            await base.initialize(user.address)  // set user as _businessAccount
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
            _propId = 1, _uri = "testUri", _quantity = 2, _type = 1
            await token1155.mint(_propId, _uri, _quantity, _type)
        })

        it("addUserTokenId succeed", async function() {
            // pre state
            _propIdOffset = BigNumber.from(2).pow(128).mul(_propId)
            _tokenId = BigNumber.from(1).add(_propIdOffset)
            expect(await userTokens.getUserTokenLength(user.address)).to.be.equal(2)
            expect(await userTokens.getUserTokenLength(alice.address)).to.be.equal(0)

            // do call
            await userTokens.addUserTokenId(alice.address, _tokenId)
            // expect result
            expect(await userTokens.getUserTokenLength(user.address)).to.be.equal(2)
            expect(await userTokens.getUserTokenLength(alice.address)).to.be.equal(1)
            _index = 0  // get the first tokenId
            infos = await userTokens.getUserTokenInfo(user.address, _index)
            expect(infos[0]).to.be.equal(_tokenId)
            expect(infos[1]).to.be.equal(_uri)
            expect(infos[2]).to.be.equal(1)
            infos = await userTokens.getUserTokenInfo(alice.address, _index)
            expect(infos[0]).to.be.equal(_tokenId)
            expect(infos[1]).to.be.equal(_uri)
            expect(infos[2]).to.be.equal(0)

            // do call again, _tokenId belong to user, nothing happens
            await userTokens.addUserTokenId(user.address, _tokenId)
            expect(await userTokens.getUserTokenLength(user.address)).to.be.equal(2)
        })

        it("addUserTokenId failed in all cases", async function () {
            await expect(userTokens.connect(user)
                .addUserTokenId(user.address, 1, {from:user.address}))
                .to.be.revertedWith("caller is not internal caller")
        })

        it("deleteUserTokenId succeed", async function () {
            // pre state: user.address has two tokenId
            expect(await userTokens.getUserTokenLength(user.address)).to.be.equal(2)
            await token1155.mint(_propId, _uri, 1, _type)
            // tokenIds: [0x10...01, 0x10...02, 0x10...03], tokenIdIndex: [0x1..1: 1, 0x1..2: 2, 0x1..3: 3]
            expect(await userTokens.getUserTokenLength(user.address)).to.be.equal(3)
            _propIdOffset = BigNumber.from(2).pow(128).mul(_propId)
            _tokenId1 = BigNumber.from(1).add(_propIdOffset)
            _tokenId2 = BigNumber.from(2).add(_propIdOffset)
            _tokenId3 = BigNumber.from(3).add(_propIdOffset)
            expect(await userTokens.getUserTokenIdIndex(user.address, _tokenId1)).to.be.equal(1)
            expect(await userTokens.getUserTokenIdIndex(user.address, _tokenId2)).to.be.equal(2)
            expect(await userTokens.getUserTokenIdIndex(user.address, _tokenId3)).to.be.equal(3)

            // do call: delete tokenId2
            await userTokens.deleteUserTokenId(user.address, _tokenId2)
            // tokenIds: [0x10...01, 0x10...03], tokenIdIndex: [0x1..1: 1, 0x1..3: 2]
            expect(await userTokens.getUserTokenLength(user.address)).to.be.equal(2)
            expect(await userTokens.getUserTokenIdIndex(user.address, _tokenId1)).to.be.equal(1)
            expect(await userTokens.getUserTokenIdIndex(user.address, _tokenId3)).to.be.equal(2)
            // _tokenId2 has been deleted, so its index is 0
            expect(await userTokens.getUserTokenIdIndex(user.address, _tokenId2)).to.be.equal(0)

            // do call again: delete tokenId1
            await userTokens.deleteUserTokenId(user.address, _tokenId1)
            expect(await userTokens.getUserTokenLength(user.address)).to.be.equal(1)
            expect(await userTokens.getUserTokenIdIndex(user.address, _tokenId3)).to.be.equal(1)
            // _tokenId1, _tokenId2 have been deleted, so their index is 0
            expect(await userTokens.getUserTokenIdIndex(user.address, _tokenId1)).to.be.equal(0)
            expect(await userTokens.getUserTokenIdIndex(user.address, _tokenId2)).to.be.equal(0)
        })

        it("deleteUserTokenId failed in all cases", async function() {
            // not internal caller
            await expect(userTokens.connect(user)
                .deleteUserTokenId(user.address, 1, {from:user.address}))
                .to.be.revertedWith("caller is not internal caller")

            // tokenId's index is 0, means it is not exist
            await expect(userTokens.deleteUserTokenId(user.address, 3))
                .to.be.revertedWith("index is zero")
        })
    })
})
