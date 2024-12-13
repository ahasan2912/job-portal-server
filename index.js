require('dotenv').config()
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.PASS_DB}@cluster0.jqnby.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    //job related api
    const jobCollection = client.db('jobPortal').collection('jobs');
    const jobApplicationCollection = client.db('jobPortal').collection('job_applications');

    app.get('/jobs', async(req, res) => {
        const email = req.query.email;
        let quary = {};
        if(email){
          quary = {hr_email: email}
        }
        const cursor = jobCollection.find(quary);
        const result = await cursor.toArray();
        res.send(result); 
    });

    app.get('/jobs/:id', async(req, res) => {
        const id = req.params.id;
        const quary = {_id : new ObjectId(id)};
        const result = await jobCollection.findOne(quary);
        res.send(result);
    })

    app.post('/jobs', async(req, res) => {
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result);

    })

    //job application
    app.get('/job-application', async(req, res) => {
      const email = req.query.email;
      const quary = {applicant_email : email};
      const cursor = jobApplicationCollection.find(quary);
      const result = await cursor.toArray();

      //fokira way to aggregate data
      for(const application of result){
        const query1 = {_id: new ObjectId(application.job_id)}
        const job = await jobCollection.findOne(query1);
        if(job){
          application.title = job.title;
          application.company = job.company;
          application.company_logo = job.company_logo;
        }
      }
      res.send(result);
    })

    app.get('/job-applications/jobs/:job_id', async(req, res) => {
      const jobId = req.params.job_id;
      const query = {job_id: jobId};
      const result = await jobApplicationCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/job-application', async(req, res) => {
      const application = req.body;
      const rusult = await jobApplicationCollection.insertOne(application);

      //Not the best way (use aggregate)
      // skip ---> it
      const id = application.job_id;
      const quary = {_id : new ObjectId(id)}
      const job = await jobCollection.findOne(quary);
      let count = 0;
      if(job.applicationCount){
        count = job.applicationCount + 1;
      }
      else{
        count = 1;
      }
      //update the job info
      const filter = {_id : new ObjectId(id)}
      const updateDoc = {
        $set: {
          applicationCount: count
        }
      }

      const updateResult = await jobCollection.updateOne(filter, updateDoc)

      res.send(rusult);
    })

    app.patch('/job-applications/:id', async(req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          status: data.status
        }
      }
      const result = await jobApplicationCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Job is falling from the sky");
})

app.listen(port, ()=> {
    console.log("Job portal running ", port);
})

