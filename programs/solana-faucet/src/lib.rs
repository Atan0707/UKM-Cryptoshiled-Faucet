use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;

declare_id!("2xySGyY8E5Wfnggfap9jfQ2WbH3T3tLGHGwLk4eKBa64");

#[program]
pub mod solana_faucet {

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn send_sol(ctx: Context<SendSol>, amount: u64) -> Result<()> {

        let sol_amount = amount / LAMPORTS_PER_SOL;
        let from = &ctx.accounts.faucet;
        let to = &ctx.accounts.recipient;

        msg!("Sending {} SOL to {}", sol_amount, to.key());

        let cpi_accounts = system_program::Transfer {
            from: from.to_account_info(),
            to: to.to_account_info(),
        };

        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        system_program::transfer(cpi_ctx, amount)?;

        msg!("Hidden message: UKM Cyberethics awesome!");

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct SendSol<'info> {
    #[account(mut)]
    pub faucet: Signer<'info>,

    #[account(mut)]
    /// CHECK: This is the recipient account, we're just sending SOL to it
    pub recipient: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}