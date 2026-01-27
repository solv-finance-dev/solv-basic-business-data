export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getEnv(): string {
	const env = process.env.CONFIG_ENV ?? 'dev';
	if (env === 'dev' || env === 'test' || env === 'prod' || env === 'local') {
		return env;
	}
	return 'dev';
}