import { RDS } from 'aws-sdk';
export function getToken(): Promise<string> {
	const signer = new RDS.Signer({
		region: process.env.CDK_DEPLOY_REGION,
		hostname: process.env.DB_PROXY_HOSTNAME,
		port: 5432,
		username: process.env.DB_USER_NAME,
	});

	return new Promise((resolve, reject) => {
		signer.getAuthToken({}, (_err, token) => {
			if (_err) {
				reject(_err);
			} else {
				resolve(token);
			}
		});
	});
}
