import express from 'express';

const app = new express();
const port = 3000;

app.use(express.json());
app.listen(port, () => {
  console.log('server started!');
});
