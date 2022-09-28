const {ethers} = require("hardhat")
const { expect } = require("chai")
const { BigNumber } = ethers
const { time } = require("./utilities")


let owner, user, alice
let erc20, tokenA, tokenB

describe("ERC20Tokens contract Test", async function() {
    before(async function() {
        this.signers = await ethers.getSigners()
        owner = this.signers[0]
        user = this.signers[1]
        alice = this.signers[2]

        this.ERC = await ethers.getContractFactory("ERC20TokensMock")
        this.Token = await ethers.getContractFactory("ERC20Mock")
    })

    beforeEach(async function() {
        erc20 = await this.ERC.deploy()
        await erc20.deployed()

        tokenA = await this.Token.deploy("TokenA", "TA")
        await tokenA.deployed()

        tokenB = await this.Token.deploy("TokenB", "TB")
        await tokenB.deployed()
    })

    it("initialize", async function() {
        // pre state
        _tokenAddrs = [tokenA.address, tokenB.address]
        expect(await erc20.isDefaultToken(tokenA.address)).to.be.equal(false)
        expect(await erc20.isDefaultToken(tokenB.address)).to.be.equal(false)
        expect(await erc20.isSupportToken(tokenA.address)).to.be.equal(false)
        expect(await erc20.isSupportToken(tokenB.address)).to.be.equal(false)
        expect(await erc20.historySupportToken(tokenA.address)).to.be.equal(false)
        expect(await erc20.historySupportToken(tokenB.address)).to.be.equal(false)
        eptSupportTokens = await erc20.getSupportTokens()
        expect(eptSupportTokens.length).to.be.equal(0)

        // do call
        await erc20.initialize(_tokenAddrs)
        // expect result
        expect(await erc20.isDefaultToken(tokenA.address)).to.be.equal(true)
        expect(await erc20.isDefaultToken(tokenB.address)).to.be.equal(true)
        expect(await erc20.isSupportToken(tokenA.address)).to.be.equal(true)
        expect(await erc20.isSupportToken(tokenB.address)).to.be.equal(true)
        expect(await erc20.historySupportToken(tokenA.address)).to.be.equal(true)
        expect(await erc20.historySupportToken(tokenB.address)).to.be.equal(true)
        eptSupportTokens = await erc20.getSupportTokens()
        expect(eptSupportTokens.length).to.be.equal(2)
    })

    describe("ERC20Tokens functions test", async function() {
        beforeEach(async function() {
            _tokenAddrs = [tokenA.address, tokenB.address]
            await erc20.initialize(_tokenAddrs)
            await erc20.setAdmin(owner.address, true)
        })

        it("addToken succeed", async function() {
            // pre state
            _dummyTokenAddrs = [user.address, alice.address]
            expect(await erc20.isSupportToken(user.address)).to.be.equal(false)
            expect(await erc20.isSupportToken(alice.address)).to.be.equal(false)
            expect(await erc20.historySupportToken(user.address)).to.be.equal(false)
            expect(await erc20.historySupportToken(alice.address)).to.be.equal(false)
            eptSupportTokens = await erc20.getSupportTokens()
            expect(eptSupportTokens.length).to.be.equal(2)

            // do call
            await erc20.addToken(_dummyTokenAddrs)
            // expect result
            expect(await erc20.isSupportToken(user.address)).to.be.equal(true)
            expect(await erc20.isSupportToken(alice.address)).to.be.equal(true)
            expect(await erc20.historySupportToken(user.address)).to.be.equal(true)
            expect(await erc20.historySupportToken(alice.address)).to.be.equal(true)
            eptSupportTokens = await erc20.getSupportTokens()
            expect(eptSupportTokens.length).to.be.equal(4)

            // do call: adding addresses that are exists
            // expect result
            await erc20.addToken(_dummyTokenAddrs)
            eptSupportTokens = await erc20.getSupportTokens()
            expect(eptSupportTokens.length).to.be.equal(4)
        })

        it("addToken failed in all cases", async function() {
            _dummyTokenAddrs = [user.address, alice.address]
            await expect(erc20.connect(user)
                .addToken(_dummyTokenAddrs, {from:user.address}))
                .to.be.revertedWith("caller is not admin");
        })

        it("deleteToken succeed", async function() {
            // pre state
            _dummyTokenAddrs = [user.address, alice.address]
            await erc20.addToken(_dummyTokenAddrs)
            expect(await erc20.isSupportToken(user.address)).to.be.equal(true)
            expect(await erc20.isSupportToken(alice.address)).to.be.equal(true)
            eptSupportTokens = await erc20.getSupportTokens()
            expect(eptSupportTokens.length).to.be.equal(4)

            // do call
            await erc20.deleteToken(_dummyTokenAddrs)
            // expect result
            expect(await erc20.isSupportToken(user.address)).to.be.equal(false)
            expect(await erc20.isSupportToken(alice.address)).to.be.equal(false)
            eptSupportTokens = await erc20.getSupportTokens()
            expect(eptSupportTokens.length).to.be.equal(2)
        })

        it("deleteToken failed in all cases", async function() {
            // not admin
            _dummyTokenAddrs = [user.address, alice.address]
            await expect(erc20.connect(user)
                .deleteToken(_dummyTokenAddrs, {from:user.address}))
                .to.be.revertedWith("caller is not admin");

            // the tokens need to be deleted are not in supportToken lists
            await expect(erc20.deleteToken(_dummyTokenAddrs))
                .to.be.revertedWith("not in support tokens")

            // cannot delete tokens in DefaultToken lists
            await expect(erc20.deleteToken(_tokenAddrs))
                .to.be.revertedWith("default can not delete")
        })

        it("withdrawToken succeed", async function() {
            // pre state
            thisAmount = 1000, transAmount = 300
            tokenA.mint(erc20.address, thisAmount)
            expect(await tokenA.balanceOf(erc20.address)).to.be.equal(thisAmount)
            expect(await tokenA.balanceOf(owner.address)).to.be.equal(0)

            // do call
            await erc20.withdrawToken(tokenA.address, transAmount)
            // expect result
            expect(await tokenA.balanceOf(erc20.address)).to.be.equal(thisAmount - transAmount)
            expect(await tokenA.balanceOf(owner.address)).to.be.equal(transAmount)
        })

        it("withdrawToken failed in all cases", async function() {
            await expect(erc20.connect(user)
                .withdrawToken(tokenA.address, 100, {from:user.address}))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("withdrawTokenBalance succeed", async function() {
            // pre state
            thisAmount = 1000
            tokenA.mint(erc20.address, thisAmount)
            expect(await tokenA.balanceOf(erc20.address)).to.be.equal(thisAmount)
            expect(await tokenA.balanceOf(owner.address)).to.be.equal(0)

            // do call
            await erc20.withdrawTokenBalance(tokenA.address)
            // expect result
            expect(await tokenA.balanceOf(erc20.address)).to.be.equal(0)
            expect(await tokenA.balanceOf(owner.address)).to.be.equal(thisAmount)
        })

        it("withdrawTokenBalance failed in all cases", async function() {
            await expect(erc20.connect(user)
                .withdrawTokenBalance(tokenA.address, {from:user.address}))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })
    })
})
