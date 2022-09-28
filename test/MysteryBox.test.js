const {ethers} = require("hardhat")
const { expect } = require("chai")
const { BigNumber } = ethers
const { time } = require("./utilities")
const { ADDRESS_ZERO } = require("./utilities")


let owner, user, alice
let mbox

describe("MysteryBox contract Test", async function() {
    before(async function() {
        this.signers = await ethers.getSigners()
        owner = this.signers[0]
        user = this.signers[1]
        alice = this.signers[2]

        this.MysteryBox = await ethers.getContractFactory("MysteryBoxMock")
    })

    beforeEach(async function() {
        mbox = await this.MysteryBox.deploy()
        await mbox.deployed()
    })

    it("initialize", async function() {
        _price = 266
        await mbox.initialize(alice.address, _price)
        expect(await mbox.getIsAdmin(owner.address)).to.be.equal(true)
        poolInfos = await mbox.getPoolBaseTokenData()
        expect(poolInfos[0]).to.be.equal(alice.address)
        expect(poolInfos[1]).to.be.equal(_price)
    })

    describe("MysteryBox functions test", async function() {
        beforeEach(async function() {
            _price = 266
            await mbox.initialize(owner.address, _price)
            await mbox.setInternal(owner.address, true)
        })

        it("setPoolBaseTokenData succeed", async function() {
            // pre state
            poolInfos = await mbox.getPoolBaseTokenData()
            expect(poolInfos[0]).to.be.equal(owner.address)
            expect(poolInfos[1]).to.be.equal(_price)

            // do call
            _newPrice = 2666
            await mbox.setPoolBaseTokenData(alice.address, _newPrice)
            // expect result
            poolInfos = await mbox.getPoolBaseTokenData()
            expect(poolInfos[0]).to.be.equal(alice.address)
            expect(poolInfos[1]).to.be.equal(_newPrice)
        })

        it("setPoolBaseTokenData failed in all cases", async function() {
            await expect(mbox.connect(user)
                .setPoolBaseTokenData(alice.address, 2666, {from:user.address}))
                .to.be.revertedWith("caller is not admin")
        })

        it("addNFTsToBoxPool succeed", async function() {
            // pre state
            _propId = 1, _quantity = 2, _startTokenId = 1
            expect(await mbox.getNFTPropIdsLength()).to.be.equal(0)
            expect(await mbox.getBoxPoolRemainedQuantity()).to.be.equal(0)
            expect(await mbox.getBoxPoolUnsoldQuantity()).to.be.equal(0)
            rang = await mbox.getDataRang(_propId)
            expect(rang[0]).to.be.equal(0)
            expect(rang[1]).to.be.equal(0)
            expect(rang[2]).to.be.equal(0)

            // do call
            await mbox.addNFTsToBoxPool(_propId, _quantity, _startTokenId)
            // expect result
            expect(await mbox.getNFTPropIdsLength()).to.be.equal(1)
            expect(await mbox.getNFTPropId(0)).to.be.equal(_propId)
            data = await mbox.getNFTData(_propId)
            expect(data[0]).to.be.equal(_quantity)
            expect(data[1]).to.be.equal(_startTokenId)
            expect(await mbox.getBoxPoolRemainedQuantity()).to.be.equal(_quantity)
            expect(await mbox.getBoxPoolUnsoldQuantity()).to.be.equal(_quantity)
            rang = await mbox.getDataRang(_propId)
            expect(rang[0]).to.be.equal(1)
            expect(rang[1]).to.be.equal(_startTokenId)
            expect(rang[2]).to.be.equal(_startTokenId + _quantity - 1)

            // do call again
            _startTokenId2 = 3
            await mbox.addNFTsToBoxPool(_propId, _quantity, _startTokenId2)
            // expect result
            expect(await mbox.getNFTPropIdsLength()).to.be.equal(1) // not change
            data = await mbox.getNFTData(_propId)
            expect(data[0]).to.be.equal(_quantity * 2) // 2 batch
            expect(data[1]).to.be.equal(_startTokenId) // not change
            expect(await mbox.getBoxPoolRemainedQuantity()).to.be.equal(_quantity*2)
            expect(await mbox.getBoxPoolUnsoldQuantity()).to.be.equal(_quantity*2)
            rang = await mbox.getDataRang(_propId)
            expect(rang[0]).to.be.equal(2)  // rang's length is 2 now
            expect(rang[1]).to.be.equal(_startTokenId2)  // last rang's start
            expect(rang[2]).to.be.equal(_startTokenId2 + _quantity - 1) // last rang's end

            // do call: another _propId
            _propId2 = 2
            await mbox.addNFTsToBoxPool(_propId2, _quantity, _startTokenId)
            // expect result
            expect(await mbox.getNFTPropIdsLength()).to.be.equal(2)
            expect(await mbox.getNFTPropId(0)).to.be.equal(_propId)
            expect(await mbox.getNFTPropId(1)).to.be.equal(_propId2)
            data = await mbox.getNFTData(_propId2)
            expect(data[0]).to.be.equal(_quantity)
            expect(data[1]).to.be.equal(_startTokenId)
            expect(await mbox.getBoxPoolRemainedQuantity()).to.be.equal(_quantity*3)
            expect(await mbox.getBoxPoolUnsoldQuantity()).to.be.equal(_quantity*3)
            rang = await mbox.getDataRang(_propId2)
            expect(rang[0]).to.be.equal(1)
            expect(rang[1]).to.be.equal(_startTokenId)
            expect(rang[2]).to.be.equal(_startTokenId + _quantity - 1)
        })

        it("addNFTsToBoxPool failed in all cases", async function() {
            // not internal caller
            await expect(mbox.connect(user)
                .addNFTsToBoxPool(1, 2, 1, {from:user.address}))
                .to.be.revertedWith("caller is not internal caller")

            // startTokenId is less than end
            await expect(mbox.addNFTsToBoxPool(1,2,0))
                .to.be.revertedWith("start token id is error")
        })

        it("mysteryBoxSold succeed", async function() {
            // pre state
            _propId = 1, _quantity = 2, _startTokenId = 1
            await mbox.addNFTsToBoxPool(_propId, _quantity, _startTokenId)
            expect(await mbox.getBoxPoolUnsoldQuantity()).to.be.equal(_quantity)

            // do call
            _sold = 1
            await mbox.mysteryBoxSold(_sold)
            // expect result
            expect(await mbox.getBoxPoolUnsoldQuantity()).to.be.equal(_quantity - _sold)
        })

        it("mysteryBoxSold failed in all cases", async function() {
            // not internal caller
            await expect(mbox.connect(user)
                .mysteryBoxSold(1, {from:user.address}))
                .to.be.revertedWith("caller is not internal caller")
        })

        it("mysteryBoxOpened succeed", async function() {
            // pre state
            _propId = 1, _q1 = 2, _startId = 1, _q2 = 1, _startId2 = 3, _sold = 1
            await mbox.addNFTsToBoxPool(_propId, _q1, _startId)
            await mbox.addNFTsToBoxPool(_propId, _q2, _startId2)
            expect(await mbox.getBoxPoolRemainedQuantity()).to.be.equal(_q1 + _q2)
            data = await mbox.getNFTData(_propId)
            expect(data[0]).to.be.equal(_q1 + _q2)
            expect(data[1]).to.be.equal(_startId)

            // do call
            await mbox.mysteryBoxSold(_sold)
            await mbox.mysteryBoxOpened(_propId)
            expect(await mbox.getBoxPoolRemainedQuantity()).to.be.equal(_q1 + _q2 - _sold)
            data = await mbox.getNFTData(_propId)
            expect(data[0]).to.be.equal(_q1 + _q2 - _sold)
            expect(data[1]).to.be.equal(_startTokenId + 1)

            // do call one more time
            await mbox.mysteryBoxSold(_sold)
            await mbox.mysteryBoxOpened(_propId)
            expect(await mbox.getBoxPoolRemainedQuantity()).to.be.equal(_q2)
            data = await mbox.getNFTData(_propId)
            expect(data[0]).to.be.equal(_q2)
            expect(data[1]).to.be.equal(_startId2)

            // do call for the last one
            await mbox.mysteryBoxSold(_sold)
            await mbox.mysteryBoxOpened(_propId)
            expect(await mbox.getBoxPoolRemainedQuantity()).to.be.equal(0)
            data = await mbox.getNFTData(_propId)
            expect(data[0]).to.be.equal(0)
            expect(data[1]).to.be.equal(0)
        })

        it("mysteryBoxOpened failed in all cases", async function() {
            // not internal caller
            await expect(mbox.connect(user)
                .mysteryBoxOpened(1, {from:user.address}))
                .to.be.revertedWith("caller is not internal caller")

            _propId = 1, _q1 = 2, _startId = 1, _q2 = 1, _startId2 = 3, _sold = 1
            await mbox.addNFTsToBoxPool(_propId, _q1, _startId)
            await mbox.addNFTsToBoxPool(_propId, _q2, _startId2)
            // open before sold
            await expect(mbox.mysteryBoxOpened(_propId))
                .to.be.revertedWith("all sold NFTs has been opened")

            // the remainedQuantity is zero
            await mbox.setDataRemainZero(_propId)
            await mbox.mysteryBoxSold(_sold)
            await expect(mbox.mysteryBoxOpened(_propId))
                .to.be.revertedWith("the NFT remained is zero")
        })
    })
})
