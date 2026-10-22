import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
  try {
    await resend.emails.send({
      from: 'Bedorahaven <onboarding@resend.dev>', // Replace with your verified custom domain in production
      to: [params.hostEmail],
      subject: `🎉 New Booking Confirmed for ${params.propertyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #059669;">New Reservation Confirmed!</h2>
          <p>You have received a new booking on <strong>Bedorahaven</strong>.</p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Property:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${params.propertyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Dates:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${params.checkIn} to ${params.checkOut} (${params.totalNights} nights)</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Guest Contact:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${params.guestContact}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Payment Method:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-transform: uppercase;">${params.paymentMethod}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Total Payout:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>KSh ${params.totalPrice.toLocaleString()}</strong></td>
            </tr>
          </table>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send Resend email notification:', error);
  }
}
