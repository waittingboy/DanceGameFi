const {ethers} = require("hardhat")
const { expect } = require("chai")
const { BigNumber } = ethers
const { time } = require("./utilities")
const { ADDRESS_ZERO } = require("./utilities")


let owner, user, alice
let base

describe("BaseInfo contract Test", async function() {
    before(async function() {
        this.signers = await ethers.getSigners()
        owner = this.signers[0]
        user = this.signers[1]
        alice = this.signers[2]

        this.BaseInfo = await ethers.getContractFactory("BaseInfo")
    })

    beforeEach(async function() {
        base = await this.BaseInfo.deploy()
        await base.deployed()
    })

    it("initialize", async function() {
        await expect(base.initialize(ADDRESS_ZERO))
            .to.be.revertedWith("account is zero address")
        await base.initialize(user.address)
        expect(await base.getBusinessAccount()).to.be.equal(user.address)
    })

    describe("BaseInfo functions test", async function() {
        beforeEach(async function() {
            await base.initialize(user.address)
        })

        it("transferBusinessAccount succeed", async function() {
            // pre state
            expect(await base.getBusinessAccount()).to.be.equal(user.address)

            // do call
            await base.transferBusinessAccount(alice.address)
            // expect result
            expect(await base.getBusinessAccount()).to.be.equal(alice.address)
        })

        it("transferBusinessAccount failed in all cases", async function() {
            // not owner
            await expect(base.connect(user)
                .transferBusinessAccount(alice.address, {from:user.address}))
                .to.be.revertedWith("Ownable: caller is not the owner")

            // transfer to zero address
            await expect(base.transferBusinessAccount(ADDRESS_ZERO))
                .to.be.revertedWith("account is zero address")
        })

        it("storeNFTData succeed", async function() {
            // pre state
            _propId = 1, _cid = "testCid"
            expect(await base.getPropIdQuantity()).to.be.equal(0)
            expect(await base.getNFTCID(_propId)).to.be.equal("")
            expect(await base.getNFTMintedQuantity(_propId)).to.be.equal(0)

            // do call
            await base.storeNFTData(_propId, _cid)
            // expect result
            expect(await base.getPropIdQuantity()).to.be.equal(1)
            expect(await base.getPropId(0)).to.be.equal(_propId)
            expect(await base.getNFTCID(_propId)).to.be.equal(_cid)
            expect(await base.getNFTMintedQuantity(_propId)).to.be.equal(0)

            // do call for another _propId
            _propId2 = 2, _cid2 = "isChanged"
            await base.storeNFTData(_propId2, _cid2)
            // expect result
            expect(await base.getPropIdQuantity()).to.be.equal(2)
            expect(await base.getPropId(0)).to.be.equal(_propId)
            expect(await base.getPropId(1)).to.be.equal(_propId2)
            expect(await base.getNFTCID(_propId)).to.be.equal(_cid)
            expect(await base.getNFTCID(_propId2)).to.be.equal(_cid2)
            expect(await base.getNFTMintedQuantity(_propId)).to.be.equal(0)
            expect(await base.getNFTMintedQuantity(_propId2)).to.be.equal(0)
        })

        it("storeNFTData failed in all cases", async function() {
            // not owner
            await expect(base.connect(user)
                .storeNFTData(1, "test", {from:user.address}))
                .to.be.revertedWith("Ownable: caller is not the owner")

            // isExist is true
            _propId = 1, _cid = "testCid"
            await base.storeNFTData(_propId, _cid)
            await expect(base.storeNFTData(_propId, _cid))
                .to.be.revertedWith("NFT is exist")
        })

        it("setNFTMintedQuantity succeed", async function() {
            // pre state
            _propId = 1, _cid = "testCid"
            await base.storeNFTData(_propId, _cid)
            expect(await base.getNFTMintedQuantity(_propId)).to.be.equal(0)
            await base.setInternal(owner.address, true)

            // do call
            _quantity = 100
            await base.setNFTMintedQuantity(_propId, _quantity)
            // expect result
            expect(await base.getNFTMintedQuantity(_propId)).to.be.equal(_quantity)
        })

        it("setNFTMintedQuantity failed in all cases", async function() {
            await expect(base.setNFTMintedQuantity(1, 100)).to.be.revertedWith("caller is not internal caller")
        })
    })
})
