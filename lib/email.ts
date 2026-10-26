import { Resend } from 'resend';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

export async function sendHostBookingNotification(params: {
  hostEmail: string;
  propertyName: string;
  guestContact: string;
  checkIn: string;
  checkOut: string;
  totalNights: number;
  totalPrice: number;
  paymentMethod: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error(
      'RESEND_FROM_EMAIL is not configured. Set it to a sender address verified in Resend.',
    );
  }

  const resend = new Resend(apiKey);
  const propertyName = escapeHtml(params.propertyName);
  const guestContact = escapeHtml(params.guestContact);
  const paymentMethod = escapeHtml(params.paymentMethod);
  const { data, error } = await resend.emails.send({
    from,
    to: [params.hostEmail],
    subject: `New Booking Confirmed for ${params.propertyName}`,
    html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #059669;">New Reservation Confirmed!</h2>
          <p>You have received a new booking on <strong>Bedorahaven</strong>.</p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Property:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${propertyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Dates:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${params.checkIn} to ${params.checkOut} (${params.totalNights} nights)</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Guest Contact:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${guestContact}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Payment Method:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-transform: uppercase;">${paymentMethod}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Total Payout:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>KSh ${params.totalPrice.toLocaleString()}</strong></td>
            </tr>
          </table>
        </div>
      `,
  });

  if (error) {
    throw new Error(`Resend failed to send host booking notification: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error('Resend did not return an email delivery ID.');
  }

  return data.id;
}

export async function sendWithdrawalRequestNotification(params: {
  adminEmails: string[];
  hostName: string;
  hostEmail: string;
  amount: number;
  methodType: 'bank' | 'mpesa';
  destination: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error(
      'RESEND_FROM_EMAIL is not configured. Set it to a sender address verified in Resend.',
    );
  }
  if (params.adminEmails.length === 0) {
    throw new Error('No admin email addresses are available for withdrawal notifications.');
  }

  const hostName = escapeHtml(params.hostName);
  const hostEmail = escapeHtml(params.hostEmail);
  const destination = escapeHtml(params.destination);
  const subjectHostName = params.hostName.replace(/[\r\n]/g, " ").slice(0, 100);
  const amount = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2,
  }).format(params.amount);

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: params.adminEmails,
    subject: `Withdrawal request: ${amount} from ${subjectHostName}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>New host withdrawal request</h2>
        <p>A host has submitted a withdrawal request for manual processing.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Host</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${hostName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${hostEmail}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Amount</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${amount}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Method</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${params.methodType.toUpperCase()}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Destination</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${destination}</td></tr>
        </table>
        <p>Open the admin earnings page to review the saved payout details and update the request after manual settlement.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend failed to send withdrawal notification: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error('Resend did not return a withdrawal notification ID.');
  }
  return data.id;
}
