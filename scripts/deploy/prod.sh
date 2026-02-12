pwd
rm -rf build
rm -rf ./aws/layers/nodejs/resolvers
npx tsc
cp -r ./build/lambda/resolvers aws/layers/nodejs/
# npm install --prefix aws/layers/nodejs
# echo "Destroying stack..."
# cdk destroy $1 -c config=prod --force

echo "deploy single stack"
cdk deploy $1 -c config=prod --require-approval never
