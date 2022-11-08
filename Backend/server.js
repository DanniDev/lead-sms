import express, { json } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import colors from 'colors';
import morgan from 'morgan';
import path from 'path';
import nodemailer from 'nodemailer';
import errorHandler from './middleware/errorMiddleware.js';
import protect from './middleware/authMiddleware.js';
import asyncHandler from 'express-async-handler';

// Routes
import adminRoutes from './routes/adminRoutes.js';
import eventRoutes from './routes/eventRoutes.js';

const app = express();

//MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// INTITIALIZE APP ENVIROMENT VARIABLES
dotenv.config();

// RECEIVED CLOSE CRM POST WEBHOOK REQUEST
//CLOSE WEBHOOK POST ENDPOINT
app.post('/textnow', async (req, res) => {
	console.log('WEBHOOK POST REQUEST ===>');
	// GET THE DATA OR THE INFO OF THE SMS FROM THE CLOSE CRM WEBHOOK
	const { event } = req.body;
	const { local_phone_formatted, contact_id, lead_id, text } = event.data;

	// CHECK TO SEE IF IT'S SMS INBOUND
	if (event.data.direction !== 'inbound') {
		console.log('OUTBOUND ALERT');
		return res.end();
	}

	// CHECK IF IT CAME FROM EXISTING LEAD
	if (lead_id && event.data.direction === 'inbound') {
		// FETCH THE LEAD THE SMS CAME FROM
		const response = await axios.get(
			`https://api.close.com/api/v1/lead/${lead_id}`,
			{
				headers: {
					Accept: 'application/json',
				},
				auth: {
					username: process.env.API_KEY,
				},
			}
		);

		// GET THE DATA FROM THE LEAD FETCH RESPONSE
		const { data: result } = response;

		// GET THE LEAD NAME AND CONTACTS OF THE LEAD
		const { contacts } = result;

		// LOOP THROUGH THE CONTACTS FOR THE LEAD CONTACT OR SENDER
		const contact = await contacts.find((contact) => contact.id === contact_id);

		// FORWARD LEAD TEXT TO CLIENT AS SMS
		// const config = {
		// 	headers: {
		// 		'Content-Type': 'application/json',
		// 	},
		// };

		// const { data } = await axios.get(
		// 	`https://sms.arkesel.com/sms/api?action=send-sms&api_key=${process.env.SMS_KEY}&to=17702035144&from=LEAD&sms=LEAD NAME : ${result.name}%0aCONTACT : ${contact.name}%0aPHONE : ${contact.phones[0].phone}%0aMESSAGE : ${text}`,
		// 	config
		// );

		// console.log('LEAD ARKESEL SMS => ', data);

		// CONST FROG SMS API
		const config = {
			headers: {
				'Content-Type': 'application/json',
			},
		};

		const payload = {
			username: 'dannyDesign',
			password: '@Service111',
			senderid: 'LEAD',
			destinations: [
				{
					destination: '17702035144',
					msgid: 101, //client's transaction id
				},
			],
			message: `LEAD NAME : ${result.name}\nCONTACT : ${contact.name}\nPHONE : ${contact.phones[0].phone}\nMESSAGE : ${text}`,
			service: 'SMS', //(SMS | EMAIL | VOICE)
			smstype: 'text', //optional. Use only for SMS (text | flash)
		};

		const { data } = await axios.post(
			'https://frog.wigal.com.gh/api/v2/sendmsg',
			payload,
			config
		);

		console.log('FROG LEAD SMS => ', data);

		// MAILING SMTP CONFIGUATION
		const transporter = nodemailer.createTransport({
			host: 'server233.web-hosting.com',
			port: 465,
			secure: true, // true for 465, false for other ports
			auth: {
				user: 'info@merkadobarkada.com', // your domain email address
				pass: process.env.USER_PASS, // your password
			},
		});

		// MAIL SENDER OPTIONS
		const mailOptions = {
			from: '"Zap-Alike Server" <info@merkadobarkada.com>', // sender address (who sends)
			to: ['dr4lyf@gmail.com', 'aandrfamilyhousing@gmail.com'], // list of receivers (who receives)
			subject: `New Sms from ${result.name}`, // Subject line
			text: `LEAD NAME : ${result.name}\nCONTACT : ${contact.name}\nPHONE : ${contact.phones[0].phone}\nMESSAGE : ${text}`, // plaintext body
			// html: template,
		};

		// // SEND THE MAIL
		await transporter.sendMail(mailOptions, (error, response) => {
			error ? console.log(error) : console.log(response);
			transporter.close();
		});

		return res.end();
	}
	if (!lead_id || lead_id === undefined) {
		if (event.data.direction === 'inbound') {
			// FORWARD LEAD TEXT TO CLIENT AS SMS
			// const config = {
			// 	headers: {
			// 		'Content-Type': 'application/json',
			// 	},
			// };

			// const { data } = await axios.get(
			// 	`https://sms.arkesel.com/sms/api?action=send-sms&api_key=${process.env.SMS_KEY}&to=17702035144&from=LEAD&sms=LEAD NAME : Not Assigned%0aCONTACT : Not Set%0aPHONE : ${event.data.remote_phone}%0aMESSAGE : ${text}`,
			// 	config
			// );

			//FROG SMS
			const config = {
				headers: {
					'Content-Type': 'application/json',
				},
			};

			const payload = {
				username: 'dannyDesign',
				password: '@Service111',
				senderid: 'LEAD',
				destinations: [
					{
						destination: '17702035144',
						msgid: 101, //client's transaction id
					},
				],
				message: `LEAD NAME : Not Assigned\nCONTACT : Not Set\nPHONE : ${event.data.remote_phone}\nMESSAGE : ${text}`,
				service: 'SMS', //(SMS | EMAIL | VOICE)
				smstype: 'text', //optional. Use only for SMS (text | flash)
			};

			const { data } = await axios.post(
				'https://frog.wigal.com.gh/api/v2/sendmsg',
				payload,
				config
			);

			console.log('FROG UNLEAD SMS => ', data);

			// MAILING SMTP CONFIGUATION
			const transporter = nodemailer.createTransport({
				host: 'server233.web-hosting.com',
				port: 465,
				secure: true, // true for 465, false for other ports
				auth: {
					user: 'info@merkadobarkada.com', // your domain email address
					pass: process.env.USER_PASS, // your password
				},
			});

			// MAIL SENDER OPTIONS
			const mailOptions = {
				from: '"Zap-Alike Server" <info@merkadobarkada.com>', // sender address (who sends)
				to: ['dr4lyf@gmail.com', 'aandrfamilyhousing@gmail.com'], // list of receivers (who receives)
				subject: `New Sms from not assigned lead`, // Subject line
				text: `LEAD NAME : Not Assigned\nCONTACT : Not Set\nPHONE : ${event.data.remote_phone}\nMESSAGE : ${text}`, // plaintext body
				// html: template,
			};

			// SEND THE MAIL
			await transporter.sendMail(mailOptions, (error, response) => {
				error ? console.log(error) : console.log(response);
				transporter.close();
			});

			return res.end();
		}
	}
});

// TEST SMS

// DELETE AXIOS WEBHOOK
app.delete('/api/unsubscribe/:id', protect, async (req, res) => {
	const { id } = req.params;

	const response = await axios(`https://api.close.com/api/v1/webhook/${id}`, {
		method: 'delete',
		headers: {
			'Content-Type': 'application/json',
		},
		auth: {
			username: process.env.API_KEY,
		},
	});
	const { data } = response;
	console.log('hello Im unsubscribeHook');
	res.json(data);
});

// SUBSCRIBE CLOSE CRM WEBHOOK
app.post('/api/subscribe', protect, async (req, res) => {
	const response = await axios('https://api.close.com/api/v1/webhook/', {
		method: 'post',
		headers: {
			'Content-Type': 'application/json',
		},
		auth: {
			username: process.env.API_KEY,
		},
		data: {
			url: 'https://leadsmsapp.herokuapp.com/textnow',
			events: [
				{
					object_type: 'activity.sms',
					action: 'created',
				},
			],
		},
	});

	const { data } = response;
	console.log('hello Im subscribe');
	res.json({ id: data.id });
});

//MIDDLEWARES
app.use('/api/admin', adminRoutes);
app.use('/api/', eventRoutes);

app.use(errorHandler);

// INTIALIZE MORGAN TO LOG EACH ROUTE ON THE CONSOLE
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
}

// PRODUCTION MODE SETUP
const __dirname = path.resolve();

if (process.env.NODE_ENV === 'production') {
	app.use(express.static(path.join(__dirname, '/client/build')));

	app.get('*', (req, res) =>
		res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'))
	);
} else {
	app.get('/', (req, res) =>
		res.send(
			'<h1 style="padding: 20px; text-align: center">Close CRM API is running on development mode...</h1>'
		)
	);
}

//SET DEFAULT PORT IF IN DEVELOPMENT MODE
const port = process.env.PORT || 5000;

app.listen(
	port,
	console.log(
		`Server running on ${port} in ${process.env.NODE_ENV} mode`.yellow
	)
);
