import { RDS } from 'aws-sdk';
export function getToken(hostname: string, username: string | undefined, region: string | undefined): Promise<string> {
	const signer = new RDS.Signer({
		region: region,
		hostname: hostname,
		port: 5432,
		username: username,
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
