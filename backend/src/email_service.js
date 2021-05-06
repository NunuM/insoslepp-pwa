const nodemailer = require("nodemailer");

const configs = require('../configs.json');

/**
 * @class
 */
class EmailService {

    /**
     * @constructor
     * @param transporter
     */
    constructor(transporter) {
        this.transporter = transporter;
    }

    /**
     * Send email
     *
     * @param {string} subject
     * @param {string} to
     * @param {string} text
     * @param {string} html
     * @param {Array<{filename:string, content:Buffer}>} [attachments=[]]
     * @return {Promise<boolean>}
     */
    sendEmail(subject, to, text, html, attachments) {
        return new Promise((resolve, reject) => {
            console.log(`Sending email with subject ${subject} to ${to}`);
            const message = {
                from: `"${configs.email.fromName}" <${configs.email.fromEmail}>`,
                to: to,
                subject: subject,
                text: text,
                html: html,
                attachments: attachments || []
            };

            this.transporter.sendMail(message, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
    }
}


/**
 * Email service instance
 * @type {EmailService}
 */
const service = new EmailService(nodemailer.createTransport(configs.email.server));

module.exports = service
