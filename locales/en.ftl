# commands
start = test
command-start = Start (greetings message)
command-createtoken = Create Token
command-createmarket = Create Market
command-createliquidity = Add Liquidity & Snipe
command-burn = Burn Tokens
command-remove = Remove LP
command-wallets = Walltes
command-settings = Bot Settings
command-tutorial = Help / FAQ

# Main menu
main-welcome =
  🚀 Snipeitxyz - Solana Token Creator & Liquidity Sniper 🤖
     <a href="https://t.me/">Telegram</a> | <a href="https://twt.com/">Twitter</a> | <a href="https://my.site.com/">Website</a>
  
     ⬩ SOL: <code class="monospace-text">${$totalDollar}</code>

     Your Primary Wallet
          ⬩ <code class="monospace-text">{$primaryWallet}</code>
          ⬩ Balance: <code class="monospace-text">{$promarySol} SOL</code>

label-create-token = 🪙 Create Token
label-create-market = 🏪 Create Market
label-add-liquidity = 💦 Add Liquidity & Snipe
label-remove-lp = 🔻 Remove LP
label-burn-tokens = 🔥 Burn Tokens
label-wallet = 💰 Wallet
label-bot-settings = ⚙ Bot Settings
label-help = ❓ Help / FAQ

#Wallets menu
wallets-title =
  💰 Wallets ({$countofWallets}) 💳 <em>{$primarySol} SOL</em>, TOTAL <em>{$totalSol}</em> SOL

  👇 Select Primary Wallet to use (Only one)

label-create-wallet = Create New Wallet
label-connect-wallet = Connect Wallet
label-gen-3-wallet = Generate 3 Wallet
label-gen-5-wallet = Generate 5 Wallet
label-transfer-all-sol = Send All Sol to One Wallet
label-reload-list = Reload List
label-delete-all = Delete All

wallets-enter-privateKey = 
  Enter private keys:
      Each privateKey is separated by a semicolon(;).

#Settings menu
settings-title =
  ⚙ Please enter Bot settings
        <b>Solana Transaction Tip</b>: <code>{$solTip} SOL</code>
        <b>Bundle Tip</b>: <code>{$bundleTip} SOL</code>

label-solana-tx-tip = Set Solana Transaction Tip
label-bundle-tip = Set Bundle Tip
label-enable-anti-mev = Enable ANTI-MEV

settings-enter-sol-tip = Enter Solana Transaction Tip:
settings-enter-bundle-tip = Enter Bundle Tip:

#Create Token menu
create-token-title =
  🪙  Enter Token Information to create
        <b>Name</b>: <code>{$name}</code>
        <b>Symbol</b>: <code>{$symbol}</code>
        <b>Decimals</b>: <code>{$decimals}</code>
        <b>Supply</b>: <code>{$supply}</code>
        <b>Image URL</b>: <code>{$image}</code>
        <b>Description</b>: <code>{$description}</code>
        <b>Website</b>: <code>{$website}</code>
        <b>Telegram</b>: <code>{$telegram}</code>
        <b>Twitter</b>: <code>{$twitter}</code>

       <b>Total Fees</b>: <code>{$totalFees} SOL</code>

label-name = 📛 Name
label-symbol = 🔡 Symbol
label-decimals = 🔢 Desimals
label-custom-decimals = Custom decimals
label-supply = 🏢 Supply
label-custom-supply = Custom Supply
label-logo = 🖼 Logo
label-description = 📝 Description
label-website = 🌐 Website
label-telegram = ✈ Telegram
label-twitter = 🐦 Twitter
label-mint-token = ⚡ Mint Token

create-token-enter-name = Enter Token Name:
create-token-enter-symbol = Enter Token Symbol:
create-token-enter-decimals = Enter Token Desimals:
create-token-enter-supply = Enter Token Supply:
create-token-enter-logo = 
  Upload Token Logo file as a Document:
  Supported formats: jpg, jpeg, png.
create-token-enter-description = Enter Token Description:
create-token-enter-website = Enter Token Website URL:
create-token-enter-telegram = Enter Token Telegram URL:
create-token-enter-twitter = Enter Token Twitter URL:

#Create Market menu
create-market-title =
  🏪 Enter Market Information to create
        <b>Base Token</b>: <code>{$baseToken}</code>
        <b>Quote Token</b>: <code>{$quoteToken}</code>
        <b>Minimum Buy</b>: <code>{$minBuy}</code>
        <b>Tick Size</b>: <code>{$tickSize}</code>
        <b>Event Length</b>: <code>{$eventLength}</code>
        <b>Request Length</b>: <code>{$requestLength}</code>
        <b>Orderbook Length</b>: <code>{$orderbookLength}</code>

       <b>Total Fees</b>: <code>{$totalFees} SOL</code>

label-token-address = 📊 Token Address
label-base-token = Base Token
label-quote-token = Quote Token
label-sol = SOL
label-usdc = USDC
label-lot-size = 🛒 Minimum Buy (Order Size)
label-tick-size = 📈 Tick Size (Min Price Cgange)
label-advance-options = Advanced Options
label-event-length = Event Length
label-request-length = Request Length
label-orderbook-length = Orderbook Length
label-create-openpool-market = ⚡ Create OpenPool Market
label-custom = Custom

#Create Market menu
create-pool-title =
  💦 Enter Liquidity Pool information to create
        <b>Market ID</b>: <code>{$marketId}</code>
        <b>Amount Percent</b>: <code>{$amountPercent} % Tokens</code>
        <b>Quote Liquidity</b>: <code>{$tokenLiquidity} SOL</code>
        <b>Sniper & Amount</b>:<code>{$buyers}</code>

       <b>Total Fees</b>: <code>{$totalFees} SOL</code>

label-liquidity-amount = 💦 Quote Token Liquidity
label-liquidity-percent = 🔢 Amount Percent

#Remove Liquidity menu
remove-liquidity-title =
  🔻 Remove Liquidity
        <b>Token Address</b>: <code>{$tokenAddress}</code>

       <b>Total Fees</b>: <code>{$totalFees} SOL</code>

label-pooi-id = 💦 Enter Pool Id
label-remove-liquidity = 🔥 Remove Liquidity

#Burn Tokens menu
burn-tokens-title =
  🔥 Burn Tokens
        <b>Token Address</b>: <code>{$tokenAddress}</code>
        <b>Amount Percent</b>: <code>{$amount} %</code>

       <b>Total Fees</b>: <code>{$totalFees} SOL</code>

label-base-amount = Base Amount
label-burn-liquidity = 🔥 Burn Liquidity