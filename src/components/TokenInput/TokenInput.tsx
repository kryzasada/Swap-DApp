import { TokenInputProps } from "./TokenInput.types"
import { useState } from "react"
import "./TokenInput.css"

const TokenInput = (props: TokenInputProps) => {
    const [value, setValue] = useState(() => props.value?.toString())

    const getPrice = (value: any) => {
        if (props.getSwapPrice)
            props.getSwapPrice(value)
    }

    const onClickBalance = () => {
        if (props.getSwapPrice)
            props.getSwapPrice(props.balance.toString())

        setValue(props.balance.toString())
    }

    const onChangeValue = (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value
        let numberInput = Number(input)

        if (input == "")
            setValue("")
        else if (!(isNaN(numberInput) || input.includes("-") || input.includes("e")))
            setValue(input)
    }

    return (
        <div className="token-input">
            <div className="token-input__left_panel">
                {props.loading ? (
                    <div className="token-input__spinner">
                        "loading..."
                    </div>
                ) : (
                    <input
                        className="token-input__input"
                        placeholder="0.0"
                        value={value}
                        disabled={props.field == "input" ? false : true}
                        onBlur={e => (props.field === 'input' ? getPrice(e.target.value) : null)}
                        onChange={onChangeValue}
                    />
                )}
            </div>
            <div className="token-input__right_panel">
                <span className="token-input__token-name">
                    {props.tokenName}
                </span>
                <div
                    className={`token-input__balance token-input__balance--${props.field}`}
                    onClick={props.field == "input" ? onClickBalance : () => { }}
                >
                    <span>
                        {props.balance?.toFixed(3)}
                    </span>
                </div>
            </div>
        </div>
    )
}

export default TokenInput