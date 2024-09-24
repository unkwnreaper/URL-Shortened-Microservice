require('dotenv').config();
let bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns');
var mongoose = require('mongoose');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// environment variables
var currentIndex = 0;

// mongoose

mongoose.connect(process.env.MONGO_URI);
const Schema = mongoose.Schema;

const urlSchema = new Schema({
  url: {type: String, required: true},
  index: {type: Number, required: true}
});

const urlModel = mongoose.model('urlModel', urlSchema);

urlModel.deleteMany({});

// add new entry
const createAndSaveUrl = (idx, url) => {
  var urlProto = new urlModel({url: url, index: idx});
  urlProto.save();
};

// find url
const getAddress = async (urlNumber) => {
  var temp =  await urlModel.findOne({ index: urlNumber }).exec();
  return temp == null ? null : temp.url;
}

// find and update url
const checkAndAddUrl = async (urlToFind) => {
  var temp = await urlModel.findOne({url: urlToFind}).exec();
  if (temp == null) {
    createAndSaveUrl(currentIndex,urlToFind);
    return currentIndex++;
  } else {
    return temp.index;
  }
}

// shorturl API endpoint post
app.post('/api/shorturl', function(req, res) {
  const urlRegex = /^https?:\/\/(www\.)?/;
  if (urlRegex.test(req.body.url))  dns.lookup((new URL(req.body.url)).hostname, async (err) => {
    if (err != null)  res.json({ error: 'invalid url'});
    else  {
      var num = await checkAndAddUrl(req.body.url);
      res.json({ original_url : req.body.url, short_url : num});
    }
  });
  else  res.json({ error: 'invalid url'});
});

// shorturl API endpoint get
app.get('/api/shorturl/*', async function(req, res) {
  const numRegex = /^[0-9]+$/;
  var temp = req.url.slice(14);
  if (numRegex.test(temp)) {
    temp = await getAddress(temp);
    if (temp == null) res.json({"error":"No short URL found for the given input"});
    else res.redirect(temp);
  }
  else res.json({ error: 'invalid url'});
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
