import { CurrencyAmount, Percent, Token, TradeType } from "@uniswap/sdk-core"
import { AlphaRouter, SwapOptionsSwapRouter02, SwapType } from "@uniswap/smart-order-router"
import JSBI from "jsbi"
import { ethers, BigNumber, ContractInterface } from "ethers"
import { Network, NetworkToken, Price, Transaction } from "./Swap.types"

export const createToken = (
    chainId: number,
    token: NetworkToken
): Token => new Token(chainId,
    token.address,
    token.decimals,
    token.symbol,
    token.name)

export const getPrice = async (
    inputAmount: number,
    decimals: number,
    slippageAmount: number,
    walletAddress: string,
    mainToken: Token,
    swapToken: Token,
    router: AlphaRouter
): Promise<Price> => {
    const percentSlippage = new Percent(Number(slippageAmount), 100)
    const inputAmountWei = ethers.utils.parseUnits(inputAmount.toString(), decimals)
    const currencyAmount = CurrencyAmount.fromRawAmount(mainToken, JSBI.BigInt(inputAmountWei))
    const deadline = Math.floor(Date.now() / 1000 + (5 * 60))

    let swapConfig: SwapOptionsSwapRouter02 = {
        recipient: walletAddress,
        slippageTolerance: percentSlippage,
        deadline: deadline,
        type: SwapType.SWAP_ROUTER_02
    }

    const route = await router.route(
        currencyAmount,
        swapToken,
        TradeType.EXACT_INPUT,
        swapConfig
    )

    const quoteAmountOut = route!.quote.toFixed(6)
    const ratio = (Number(quoteAmountOut) / inputAmount).toFixed(3)

    return {
        data: route!.methodParameters!.calldata,
        value: route!.methodParameters!.value,
        gasPrice: BigNumber.from(route!.gasPriceWei),
        quoteAmountOut: quoteAmountOut,
        ratio
    }
}

export const getTransactionData = (
    walletAddress: string,
    data: string,
    value: string,
    gasPrice: ethers.BigNumber
): Transaction => {
    return {
        data,
        to: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
        value,
        from: walletAddress,
        gasPrice,
        gasLimit: ethers.utils.hexlify(1000000)
    }
}

export const runSwap = async (
    transaction: Transaction,
    wallet: string,
    amount: number,
    contract: ethers.Contract
): Promise<void> => {
    const SWAP_ROUTER_ADDRESS = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E"
    const provider = new ethers.providers.Web3Provider(window.ethereum as any)
    const signer = provider.getSigner()

    let allowance = await contract.connect(signer).allowance(
        wallet,
        SWAP_ROUTER_ADDRESS
    )
    let formatAllowance = Number(ethers.utils.formatEther(allowance))

    if (formatAllowance <= amount) {
        let approve = await sendContractApprove(contract, signer, SWAP_ROUTER_ADDRESS, amount)
        if (approve.status == 1)
            await sendTransaction(signer, transaction)
    }
    else
        await sendTransaction(signer, transaction)
}

const sendContractApprove = async (
    contract: ethers.Contract,
    signer: ethers.providers.JsonRpcSigner,
    swap_router_address: string,
    amount: number
) => {
    const parseAmount = ethers.utils.parseUnits(amount.toString(), 18)

    let contractApprove = await contract.connect(signer).approve(
        swap_router_address,
        parseAmount
    )
    return await contractApprove.wait()
}

const sendTransaction = async (
    signer: ethers.providers.JsonRpcSigner,
    transaction: Transaction
): Promise<ethers.providers.TransactionReceipt> => {
    const txn_receipt = await signer.sendTransaction(transaction)
    return await txn_receipt.wait()
}

export const getNetworkByChainId = (
    networks: Array<Network>,
    chainId: string
): Network => {
    let network = networks.filter(
        network => (network.chainId === chainId.toString()
            && network.tokens.length > 0
            && !network.disable)
    )[0]
        
    if (network !== undefined && network.tokens === undefined)
        throw new RangeError(`Insufficient tokens in ${network.name} network`)

    return network
}

export const isDisabled = (
    networks: Array<Network>,
    chainId: string,
    address: string
): boolean => (!!getNetworkByChainId(networks, chainId) && !!address)

export const getTokenBalance = async (
    walletAddress: string,
    tokenAddress: string,
    ERC20ABI: ContractInterface,
    web3Provider: ethers.providers.JsonRpcProvider
): Promise<number> => {
    const contract = new ethers.Contract(tokenAddress, ERC20ABI, web3Provider)
    return await contract.balanceOf(walletAddress)
        .then((res: string) =>
            Number(ethers.utils.formatEther(res))
        )
}

export const changeTokens = (
    networks: Array<Network>,
    chainId: string,
    currentToken: string
) => {
    let network = getNetworkByChainId(networks, chainId)
    return currentToken === network.tokens[0].symbol
        ? {
            "mainToken": network.tokens[1],
            "swapToken": network.tokens[0]
        } : {
            "mainToken": network.tokens[0],
            "swapToken": network.tokens[1]
        }
}