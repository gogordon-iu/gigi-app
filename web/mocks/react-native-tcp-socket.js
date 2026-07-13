export default {
  createConnection: () => {
    throw new Error("TCP Socket is not supported on Web. Please use WebSocket mode.");
  }
};
