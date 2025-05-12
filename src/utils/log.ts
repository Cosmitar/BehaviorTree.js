import util from 'util';
export const log = (args: unknown) => {
  console.log(util.inspect(args, { showHidden: true, depth: null, colors: true }));
};
