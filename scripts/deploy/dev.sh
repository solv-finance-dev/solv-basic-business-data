pwd
rm -rf build
rm -rf ./aws/layers/nodejs/resolvers
npx tsc

echo "deploy single stack"
cdk deploy $1 -c config=dev --require-approval never
