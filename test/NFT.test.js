const {ethers} = require("hardhat")
const { expect } = require("chai")
const { BigNumber } = ethers
const { ADDRESS_ZERO } = require("./utilities")

let owner, user, alice, bob
let userTokens, nft, base, mysteryBox, salesMarket

describe("NFT contract test", async function() {
    before(async function() {
        this.signers = await ethers.getSigners()
        owner = this.signers[0]
        user = this.signers[1]
        alice = this.signers[2]
        bob = this.signers[3]

        this.UserToken = await ethers.getContractFactory("UserTokens")
        this.NFT = await ethers.getContractFactory("NFT")
        this.BaseInfo = await ethers.getContractFactory("BaseInfo")
        this.MysteryBox = await ethers.getContractFactory("MysteryBox")
        this.SalesMarket = await ethers.getContractFactory("NFTSalesMarket")
        this.Token20 = await ethers.getContractFactory("ERC20Mock")
    })

    beforeEach(async function() {
        nft = await this.NFT.deploy()
        await nft.deployed()

        userTokens = await this.UserToken.deploy()
        await userTokens.deployed()

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
        await nft.initialize(
            base.address, mysteryBox.address, salesMarket.address,
            userTokens.address, user.address
        )
        // expect result
        expect(await nft.baseInfo()).to.be.equal(base.address)
        expect(await nft.mysteryBox()).to.be.equal(mysteryBox.address)
        expect(await nft.salesMarket()).to.be.equal(salesMarket.address)
        expect(await nft.userTokens()).to.be.equal(userTokens.address)
        expect(await nft.mysteryBoxMarketAddress()).to.be.equal(user.address)
        expect(await nft.isAllowMint()).to.be.equal(true)
    })

    describe("NFT functions test", async function() {
        beforeEach(async function() {
            await userTokens.initialize(nft.address)
            await userTokens.setInternal(nft.address, true)
            await base.initialize(user.address)  // set user as _businessAccount
            await base.setInternal(nft.address, true)
            await mysteryBox.initialize(owner.address, 1000)
            await mysteryBox.setInternal(nft.address, true)
            _token20Addrs = [token20.address]
            await salesMarket.initialize(nft.address, base.address, user.address, _token20Addrs)
            await salesMarket.setInternal(nft.address, true)
            await nft.initialize(
                base.address, mysteryBox.address, salesMarket.address,
                userTokens.address, alice.address
            )
        })

        it("mint succeed", async function() {
            // pre state
            _propId = 1, _uri = "testUri", _quantity = 2, _types = [1,2,3]
            expect(await base.getNFTMintedQuantity(_propId)).to.be.equal(0)

            // do call: mint for _businessAccount(user.address)
            await nft.mint(_propId, _uri, _quantity, _types[0])
            // expect result
            _propIdOffset = BigNumber.from(2).pow(128).mul(_propId)
            _tokenId1 = BigNumber.from(1).add(_propIdOffset)
            _tokenId2 = BigNumber.from(2).add(_propIdOffset)
            expect(await nft.balanceOf(user.address, _tokenId1)).to.be.equal(1)
            expect(await base.getNFTMintedQuantity(_propId)).to.be.equal(2)
            infos = await userTokens.getUserTokenInfo(user.address, 1)
            expect(infos[0]).to.be.equal(_tokenId2)
            expect(infos[1]).to.be.equal(_uri)
            expect(infos[2]).to.be.equal(1)
            // check uri => tokenId
            expect(await nft.uri(_tokenId1)).to.be.equal(_uri)
            expect(await nft.uri(_tokenId2)).to.be.equal(_uri)

            // do call: mint for mysteryBoxMarketAddress(alice.address)
            await nft.mint(_propId, _uri, _quantity, _types[1])
            // expect result
            _tokenId3 = BigNumber.from(3).add(_propIdOffset)
            _tokenId4 = BigNumber.from(4).add(_propIdOffset)
            // tokenId2 is belong to user.address
            expect(await nft.balanceOf(alice.address, _tokenId2)).to.be.equal(0)
            expect(await nft.balanceOf(alice.address, _tokenId3)).to.be.equal(1)
            expect(await base.getNFTMintedQuantity(_propId)).to.be.equal(4)
            infos = await userTokens.getUserTokenInfo(alice.address, 1)
            expect(infos[0]).to.be.equal(_tokenId4)
            expect(infos[1]).to.be.equal(_uri)
            expect(infos[2]).to.be.equal(1)

            // do call: mint for NFTSalesMarketAddress(salesMarket.address)
            tx = await nft.mint(_propId, _uri, _quantity, _types[2])
            // expect result
            _tokenId5 = BigNumber.from(5).add(_propIdOffset)
            _tokenId6 = BigNumber.from(6).add(_propIdOffset)
            expect(await nft.balanceOf(salesMarket.address, _tokenId5)).to.be.equal(1)
            expect(await base.getNFTMintedQuantity(_propId)).to.be.equal(6)
            infos = await userTokens.getUserTokenInfo(salesMarket.address, 1)
            expect(infos[0]).to.be.equal(_tokenId6)
            expect(infos[1]).to.be.equal(_uri)
            expect(infos[2]).to.be.equal(1)

            // check emitEvent
            receipt = await tx.wait()
            mintEvent = receipt.events.pop()
            expect(mintEvent.event).to.be.equal("NFTMinted")
            expect(mintEvent.eventSignature)
                .to.be.equal("NFTMinted(uint256,uint256,uint256,uint256[])")
            amounts = mintEvent.args
            expect(amounts._propId).to.be.equal(_propId)
            expect(amounts._quantity).to.be.equal(_quantity)
            expect(amounts._type).to.be.equal(_types[2])
            expect(amounts._tokenIds.length).to.be.equal(2)
            expect(amounts._tokenIds[0]).to.be.equal(_tokenId5)
            expect(amounts._tokenIds[1]).to.be.equal(_tokenId6)
        })

        it("mint failed in all cases", async function() {
            // not owner
            await expect(nft.connect(user)
                .mint(1, "", 1, 1, {from:user.address}))
                .to.be.revertedWith("Ownable: caller is not the owner")

            // mint quantity must GT 0
            await expect(nft.mint(1, "", 0, 1))
                .to.be.revertedWith("quantity is zero")

            // not allow mint
            await nft.setNotAllowMint()
            await expect(nft.mint(1, "", 1, 1))
                .to.be.revertedWith("you can never mint again")
        })

        it("setNotAllowMint succeed", async function() {
            // pre state
            expect(await nft.isAllowMint()).to.be.equal(true)

            // do call
            await nft.setNotAllowMint()
            // expect result
            expect(await nft.isAllowMint()).to.be.equal(false)
        })

        it("setNotAllowMint failed in all cases", async function() {
            // not owner
            await expect(nft.connect(user).setNotAllowMint({from:user.address}))
                .to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("burn succeed", async function() {
            // pre state
            _propId = 1, _uri = "testUri", _quantity = 2, _type = 1
            await nft.mint(_propId, _uri, _quantity, _type)
            _propIdOffset = BigNumber.from(2).pow(128).mul(_propId)
            _tokenIds = [BigNumber.from(1).add(_propIdOffset), BigNumber.from(2).add(_propIdOffset)]
            _quantities = [1, 1]
            expect(await userTokens.getUserTokenLength(user.address)).to.be.equal(2)
            infos = await userTokens.getUserTokenInfo(user.address, 1)
            expect(infos[0]).to.be.equal(_tokenIds[1])
            expect(infos[1]).to.be.equal(_uri)
            expect(infos[2]).to.be.equal(1)

            // do call: delete caller's tokenIds, we just mint for user.address, caller must be user.address
            tx = await nft.connect(user).burn(_tokenIds, _quantities, {from:user.address})
            // expect result
            expect(await userTokens.getUserTokenLength(user.address)).to.be.equal(0)
            // check emitEvent
            receipt = await tx.wait()
            burnEvent = receipt.events.pop()
            expect(burnEvent.event).to.be.equal("NFTBurned")
            expect(burnEvent.eventSignature)
                .to.be.equal("NFTBurned(address,uint256[],uint256[])")
            amounts = burnEvent.args
            expect(amounts._from).to.be.equal(user.address)
            expect(amounts._tokenIds.length).to.be.equal(2)
            expect(amounts._tokenIds[0]).to.be.equal(_tokenIds[0])
            expect(amounts._tokenIds[1]).to.be.equal(_tokenIds[1])
            expect(amounts._quantities.length).to.be.equal(2)
            expect(amounts._quantities[0]).to.be.equal(1)
            expect(amounts._quantities[1]).to.be.equal(1)
        })

        it("burn failed in all cases", async function () {
            // tokenIds' length must match quantities' length
            await expect(nft.burn([1,2], [1])).to.be.revertedWith("ids and quantities length mismatch")
        })

        it("safeTransferFrom succeed", async function () {
            // pre state: mint for user.address
            _propId = 1, _uri = "testUri", _quantity = 2, _type = 1
            await nft.mint(_propId, _uri, _quantity, _type)
            _propIdOffset = BigNumber.from(2).pow(128).mul(_propId)
            _tokenIds = [BigNumber.from(1).add(_propIdOffset), BigNumber.from(2).add(_propIdOffset)]
            expect(await userTokens.getUserTokenLength(user.address)).to.be.equal(2)

            // do call
            await nft.connect(user).safeTransferFrom(user.address, alice.address,
                _tokenIds[0], 1, "0x00", {from:user.address})
            // expect result
            expect(await nft.balanceOf(user.address, _tokenIds[0])).to.be.equal(0)
            expect(await nft.balanceOf(alice.address, _tokenIds[0])).to.be.equal(1)
            expect(await userTokens.getUserTokenLength(user.address)).to.be.equal(1)
            infos = await userTokens.getUserTokenInfo(user.address, 0)
            expect(infos[0]).to.be.equal(_tokenIds[1])
            expect(infos[1]).to.be.equal(_uri)
            expect(infos[2]).to.be.equal(1)
            expect(await userTokens.getUserTokenLength(alice.address)).to.be.equal(1)
            infos = await userTokens.getUserTokenInfo(alice.address, 0)
            expect(infos[0]).to.be.equal(_tokenIds[0])
            expect(infos[1]).to.be.equal(_uri)
            expect(infos[2]).to.be.equal(1)
        })

        it("safeTransferFrom failed in all cases", async function () {
            // pre state: mint for user.address
            _propId = 1, _uri = "testUri", _quantity = 2, _type = 1
            await nft.mint(_propId, _uri, _quantity, _type)
            _propIdOffset = BigNumber.from(2).pow(128).mul(_propId)
            _tokenIds = [BigNumber.from(1).add(_propIdOffset), BigNumber.from(2).add(_propIdOffset)]

            // insufficient balance
            await expect(nft.connect(user).safeTransferFrom(
                alice.address, bob.address, _tokenIds[0], 1, "0x00", {from:user.address}))
                .to.be.revertedWith("balance is less than amount or amount is zero")

            // amount is zero
            await expect(nft.connect(user).safeTransferFrom(
                user.address, bob.address, _tokenIds[0], 0, "0x00", {from:user.address}))
                .to.be.revertedWith("balance is less than amount or amount is zero")
        })

        it("safeBatchTransferFrom succeed", async function() {
            // pre state: mint for user.address
            _propId = 1, _uri = "testUri", _quantity = 2, _type = 1
            await nft.mint(_propId, _uri, _quantity, _type)
            _propIdOffset = BigNumber.from(2).pow(128).mul(_propId)
            _tokenIds = [BigNumber.from(1).add(_propIdOffset), BigNumber.from(2).add(_propIdOffset)]
            expect(await userTokens.getUserTokenLength(user.address)).to.be.equal(2)

            // do call
            await nft.connect(user).safeBatchTransferFrom(user.address, alice.address,
                _tokenIds, [1, 1], "0x00", {from:user.address})
            // expect result
            expect(await userTokens.getUserTokenLength(user.address)).to.be.equal(0)
            expect(await userTokens.getUserTokenLength(alice.address)).to.be.equal(2)
            infos = await userTokens.getUserTokenInfo(alice.address, 0)
            expect(infos[0]).to.be.equal(_tokenIds[0])
            infos = await userTokens.getUserTokenInfo(alice.address, 1)
            expect(infos[0]).to.be.equal(_tokenIds[1])
            expect(infos[1]).to.be.equal(_uri)
            expect(infos[2]).to.be.equal(1)
        })

        it("safeBatchTransferFrom failed in all cases", async function() {
            // pre state: mint for user.address
            _propId = 1, _uri = "testUri", _quantity = 2, _type = 1
            await nft.mint(_propId, _uri, _quantity, _type)
            _propIdOffset = BigNumber.from(2).pow(128).mul(_propId)
            _tokenIds = [BigNumber.from(1).add(_propIdOffset), BigNumber.from(2).add(_propIdOffset)]

            // insufficient balance
            await expect(nft.connect(user).safeBatchTransferFrom(
                alice.address, bob.address, _tokenIds, [1, 1], "0x00", {from:user.address}))
                .to.be.revertedWith("balance is less than amount or amount is zero")

            // amount is zero
            await expect(nft.connect(user).safeBatchTransferFrom(
                user.address, bob.address, _tokenIds, [0, 1], "0x00", {from:user.address}))
                .to.be.revertedWith("balance is less than amount or amount is zero")
        })
    })
})
