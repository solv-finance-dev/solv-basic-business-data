import { SecretsManager } from 'aws-sdk';

export function getSecretValue(secretName: string, region: string): Promise<string | undefined> {
	const client = new SecretsManager({ region });
	const params = { SecretId: secretName };
	return new Promise((resolve, reject) => {
		client.getSecretValue(params, (_err, secret: SecretsManager.Types.GetSecretValueResponse) => {
			if (_err) {
				console.log('getSecretValue Error📚', _err);
				reject(_err);
			} else {
				resolve(secret.SecretString);
			}
		});
	});
}
