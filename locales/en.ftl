# commands
start = test
command-start = Start (greetings message)
command-settings = Bot Settings
command-wallets = Walltes
command-help = Help / FAQ

# Main menu
main-welcome =
  🚀 YellowApe - Solana Token & Liquidity Creator Bot 🤖
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
  Wallets ({$countofWallets}) 💳 <em>{$primarySol} SOL</em>, TOTAL <em>{$totalSol}</em> SOL

  👇 Select Primary Wallet to use (Only one)
  ----------------------------------------------------------------------------------------------------

label-create-wallet = Create New Wallet
label-connect-wallet = Connect Wallet
label-gen-3-wallet = Generate 3 Wallet
label-gen-5-wallet = Generate 5 Wallet
label-transfer-all-sol = Transfer All Sol To Primary Wallet
label-reload-list = Reload List
label-delete-all = Delete All

wallets-enter-privateKey = 
  Enter private keys:
      Each privateKey is separated by a semicolon(;).

#Settings menu
settings-title =
  👇 Enter Bot settings
  ----------------------------------------------------------

label-solana-tx-tip = Set Solana Transaction Tip
label-bundle-tip = Set Bundle Tip
label-enable-anti-mev = Enable ANTI-MEV

settings-enter-sol-tip = Enter Solana Transaction Tip:
settings-enter-bundle-tip = Enter Bundle Tip:

#Create Token menu
create-token-title =
  👇 Enter Token Information to create
  --------------------------------------------------------------------------------------------------

label-name = 📛 Name
label-symbol = 🔡 Symbol
label-decimals = 🔢 Desimals
label-custom-decimals = Custom decimals
label-supply = 🏢 Supply
label-custom-supply = Custom Supply
label-image-url = 🖼 Image URL
label-description = 📝 Description
label-website = 🌐 Website
label-telegram = ✈ Telegram
label-twitter = 🐦 Twitter
label-mint-token = ⚡ Mint Token

create-token-enter-name = Enter Token Name:
create-token-enter-symbol = Enter Token Symbol:
create-token-enter-decimals = Enter Token Desimals:
create-token-enter-supply = Enter Token Supply:
create-token-enter-image-url = Enter Token Image URL:
create-token-enter-description = Enter Token Description:
create-token-enter-website = Enter Token Website URL:
create-token-enter-telegram = Enter Token Telegram URL:
create-token-enter-twitter = Enter Token Twitter URL:

#Create Market menu
create-market-title =
  👇 Enter Market Information to create
  --------------------------------------------------------------------------------------------------

label-token-address = 📊 Token Address
label-base-token = Base Token
label-quote-token = Quote Token
label-sol = SOL
label-usdt = USDT
label-lot-size = 🛒 Minimum Buy (Order Size)
label-tick-size = 📈 Tick Size (Min Price Cgange)
label-advance-options = ⚙ Advance Options (Options)
label-event-length = Event Length
label-request-length = Request Length
label-orderbook-length = Orderbook Length
label-create-openpool-market = ⚡ Create OpenPool Market
label-custom = Custom

#Create Market menu
create-pool-title =
  👇 Enter Liquidity Pool information to create
  --------------------------------------------------------------------------------------------------

label-liquidity-amount = 💦 Quote Token Liquidity
label-liquidity-percent = 🔢 Amount Percent

#Remove Liquidity menu
remove-liquidity-title =
  👇 Remove Liquidity
  --------------------------------------------------------------------------------------------------

label-remove-liquidity = 🔥 Remove Liquidity

#Burn Tokens menu
burn-tokens-title =
  👇 Burn Tokens
  --------------------------------------------------------------------------------------------------

label-base-amount = Base Amount
label-burn-liquidity = 🔥 Burn Liquidity