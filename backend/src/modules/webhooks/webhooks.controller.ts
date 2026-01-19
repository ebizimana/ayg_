import { Body, Controller, Headers, Post } from '@nestjs/common';
import { UserTier } from '@prisma/client';
import Stripe from 'stripe';
import { UsersService } from '../users/users.service';

@Controller('webhooks')
export class WebhooksController {
  private stripe: Stripe | null = null;

  constructor(private usersService: UsersService) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
    }
  }

  @Post('stripe')
  async handleStripeWebhook(@Body() body: Buffer, @Headers('stripe-signature') signature?: string) {
    if (!this.stripe) {
      return { received: false, reason: 'Stripe not configured' };
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return { received: false, reason: 'Stripe webhook secret missing' };
    }
    if (!signature) {
      return { received: false, reason: 'Missing Stripe signature' };
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      return { received: false, reason: 'Signature verification failed' };
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.applyTierFromSession(session, UserTier.PAID);
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const customer = subscription.customer as string | null;
      if (customer) {
        await this.applyTierFromCustomer(customer, UserTier.PAID);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customer = subscription.customer as string | null;
      if (customer) {
        await this.applyTierFromCustomer(customer, UserTier.FREE);
      }
    }

    return { received: true };
  }

  private async applyTierFromSession(session: Stripe.Checkout.Session, tier: UserTier) {
    const userId = session.client_reference_id ?? null;
    if (userId) {
      await this.usersService.updateTier(userId, tier);
      return;
    }

    const email =
      session.customer_email ??
      session.customer_details?.email ??
      null;
    if (email) {
      const user = await this.usersService.findByEmail(email);
      if (user) {
        await this.usersService.updateTier(user.id, tier);
      }
    }
  }

  private async applyTierFromCustomer(customerId: string, tier: UserTier) {
    if (!this.stripe) return;
    const customer = (await this.stripe.customers.retrieve(customerId)) as Stripe.Customer;
    const email = customer?.email;
    if (!email) return;
    const user = await this.usersService.findByEmail(email);
    if (user) {
      await this.usersService.updateTier(user.id, tier);
    }
  }
}
