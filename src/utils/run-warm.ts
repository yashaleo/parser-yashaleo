import { Handler, Context, Callback } from 'aws-lambda';

const runWarm = (lambdaFunc: Handler): Handler => {
  return (event: any, context: Context, callback: Callback) => {
    // Detect keep-alive pings from CloudWatch Events
    if (event.source === 'aws.events') {
      return callback(null, 'pinged');
    }

    return lambdaFunc(event, context, callback);
  };
};

export default runWarm;