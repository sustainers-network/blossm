export default (payload) => ({
  name: payload.name,
  ticker: payload.ticker.toUpperCase()
});
