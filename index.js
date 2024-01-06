const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Database connection
// Database connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
client.connect();
client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Set up collections
    const admin = client.db("Jaber-Portfolio").collection("admin");
    const tokenCollection = client.db("Jaber-Portfolio").collection("tokenCollection");
    const projects = client.db("Jaber-Portfolio").collection("projects");
    const blogs = client.db("Jaber-Portfolio").collection("blogs");



    app.post('/auth', async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        const user = await admin.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'User Not Found!' });
        }
        if (password !== user.password) {
            return res.status(401).json({ message: 'Incorrect Password.' });
        }
        const authToken = uuidv4();
        const tokenExists = await tokenCollection.findOne({ email });

        if (tokenExists) {
            await tokenCollection.updateOne({ email }, { $set: { token: authToken } });
        } else {
            await tokenCollection.insertOne({ email, token: authToken });
        }
        return res.status(200).json({ uuid: user.uuid, message: 'Authentication successful.', token: authToken });
    });



app.post('/blog', upload.single('image'), async (req, res) => {
  const { title, subtitle, link } = req.body;
  const imageFile = req.file;
      if (!title) {
        return res.status(401).json({ message: 'Blog post title is required!' });
      }
      if (!subtitle) {
        return res.status(401).json({ message: 'Blog post sub-title is required!' });
      }
      if (!link) {
        return res.status(401).json({ message: 'Blog post link is required!' });
      }
      if (!imageFile) {
        return res.status(401).json({ message: 'Blog post image is required!' });
      }

      const uuid = parseInt(req.headers.uuid);
      const token = req.headers.token;
      
      if (!token || !uuid) {
        return res.status(401).json({ message: 'You are not authorization to post.' });
      }
      const tokenExists = await tokenCollection.findOne({ token,uuid });
    //   console.log(tokenExists, typeof(uuid))
        if (!tokenExists) {
            return res.status(401).json({ message: 'You are not authorization to post.' });
        }
      const blogPost = {
        title,
        subtitle,
        link,
        image: {
          data: imageFile.buffer, // Buffer containing the image data
          contentType: imageFile.mimetype // MIME type of the image
        }
      };

      const result = await blogs.insertOne(blogPost);
      res.status(201).json({ message: 'Blog post created successfully', postId: result.insertedId });
    });


    // GET API endpoint for retrieving all blogs
    app.get('/blog', async (req, res) => {
      const blogPosts = await blogs.find({}).toArray();
      res.status(200).json(blogPosts);
    });

    // GET API endpoint for retrieving a single blog post by ID
    app.get('/blog/:id', async (req, res) => {
      const blogId = req.params.id;
      try {
        const blog = await blogs.findOne({ _id: ObjectId(blogId) });
        if (!blog) {
          return res.status(404).json({ message: 'Blog post not found' });
        }
        res.status(200).json(blog);
      } catch (err) {
        console.error('Error fetching blog post:', err);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // PUT API endpoint for updating a single blog post by ID
    app.put('/blog/:id', upload.single('image'), async (req, res) => {
      const blogId = req.params.id;
      const { title, subtitle, link } = req.body;
      const imageFile = req.file;

      if (!title) {
        return res.status(401).json({ message: 'Blog post title is required!' });
      }
      if (!subtitle) {
        return res.status(401).json({ message: 'Blog post sub-title is required!' });
      }
      if (!link) {
        return res.status(401).json({ message: 'Blog post link is required!' });
      }
      if (!imageFile) {
        return res.status(401).json({ message: 'Blog post image is required!' });
      }
      try {
      const uuid = parseInt(req.headers.uuid);
      const token = req.headers.token;
      
      if (!token || !uuid) {
        return res.status(401).json({ message: 'You are not authorization to Update.' });
      }
      const tokenExists = await tokenCollection.findOne({ token,uuid });
        //   console.log(tokenExists, typeof(uuid))
        if (!tokenExists) {
            return res.status(401).json({ message: 'You are not authorization to Update.' });
        }
        let updateFields = { title, subtitle, link };
        if (imageFile) {
          // If a new image is uploaded, update the 'image' field
          updateFields.image = {
            data: imageFile.buffer, // Buffer containing the image data
            contentType: imageFile.mimetype // MIME type of the image
          };
        }
        const updatedBlog = await blogs.findOneAndUpdate(
          { _id: ObjectId(blogId) },
          { $set: updateFields },
          { returnOriginal: false } // To return the updated document
        );
        if (!updatedBlog.value) {
          return res.status(404).json({ message: 'Blog post not found' });
        }
        res.status(200).json(updatedBlog.value);
      } catch (err) {
        console.error('Error updating blog post:', err);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

        // DELETE API endpoint for deleting a single blog post by ID
    app.delete('/blog/:id', async (req, res) => {
      const blogId = req.params.id;
      try {
            const uuid = parseInt(req.headers.uuid);
            const token = req.headers.token;
            if (!token || !uuid) {
                return res.status(401).json({ message: 'You are not authorization to delete.' });
            }
            const tokenExists = await tokenCollection.findOne({ token,uuid });
            //   console.log(tokenExists, typeof(uuid))
            if (!tokenExists) {
                return res.status(401).json({ message: 'You are not authorization to delete.' });
            }
        // Find the blog post using its ID and delete it
        const deletedBlog = await blogs.findOneAndDelete({ _id: ObjectId(blogId) });
        if (!deletedBlog.value) {
          return res.status(404).json({ message: 'Blog post not found' });
        }
        res.status(200).json({ message: 'Blog post deleted successfully' });
      } catch (err) {
        console.error('Error deleting blog post:', err);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    app.post('/projects',upload.single('image'), async (req, res) => {
      const { title, link } = req.body;
      const imageFile = req.file;
      if (!title) {
        return res.status(401).json({ message: 'Projects title is required!' });
      }
      if (!link) {
        return res.status(401).json({ message: 'Projects link is required!' });
      }
      if (!imageFile) {
        return res.status(401).json({ message: 'Projects image is required!' });
      }

      const uuid = parseInt(req.headers.uuid);
      const token = req.headers.token;
      
      if (!token || !uuid) {
        return res.status(401).json({ message: 'You are not authorization to post.' });
      }
      const tokenExists = await tokenCollection.findOne({ token,uuid });
    //   console.log(tokenExists, typeof(uuid))
        if (!tokenExists) {
            return res.status(401).json({ message: 'You are not authorization to post.' });
        }
      const projectsPost = {
        title,
        link,
        image: {
          data: imageFile.buffer,
          contentType: imageFile.mimetype
        }
      };

      const result = await projects.insertOne(projectsPost);
      res.status(201).json({ message: 'Project created successfully', postId: result.insertedId });
    });

    app.get('/projects', async (req, res) => {
      const projectPosts = await projects.find({}).toArray();
      res.status(200).json(projectPosts);
    });


    // GET API endpoint to get a single project by _id
    app.get('/projects/:id', async (req, res) => {
      const projectId = req.params.id;
      try {
        const project = await projects.findOne({ _id: ObjectId(projectId) });
        if (!project) {
          return res.status(404).json({ message: 'Project not found' });
        }
        res.status(200).json(project);
      } catch (err) {
        console.error('Error fetching project:', err);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // PUT API endpoint to update a project by _id
    app.put('/projects/:id', upload.single('image'), async (req, res) => {
      const projectId = req.params.id;
      const { title, link } = req.body;
      const imageFile = req.file; 
      if (!title) {
        return res.status(401).json({ message: 'Projects title is required!' });
      }
      if (!link) {
        return res.status(401).json({ message: 'Projects link is required!' });
      }
      if (!imageFile) {
        return res.status(401).json({ message: 'Projects image is required!' });
      }
      let updatedFields = { title, link };
      if (imageFile) {
        // If a new image is uploaded, update the 'image' field
        updatedFields.image = {
          data: imageFile.buffer, // Buffer containing the image data
          contentType: imageFile.mimetype // MIME type of the image
        };
      }
      try {
            const uuid = parseInt(req.headers.uuid);
            const token = req.headers.token;
            if (!token || !uuid) {
                return res.status(401).json({ message: 'You are not authorization to update.' });
            }
            const tokenExists = await tokenCollection.findOne({ token,uuid });
            //   console.log(tokenExists, typeof(uuid))
            if (!tokenExists) {
                return res.status(401).json({ message: 'You are not authorization to update.' });
            }
        const updatedProject = await projects.findOneAndUpdate(
          { _id: ObjectId(projectId) },
          { $set: updatedFields },
          { returnOriginal: false }
        );
        if (!updatedProject.value) {
          return res.status(404).json({ message: 'Project not found' });
        }
        res.status(200).json(updatedProject.value);
      } catch (err) {
        console.error('Error updating project:', err);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // DELETE API endpoint to delete a project by _id
    app.delete('/projects/:id', async (req, res) => {
      const projectId = req.params.id;
      try {
            const uuid = parseInt(req.headers.uuid);
            const token = req.headers.token;
            if (!token || !uuid) {
                return res.status(401).json({ message: 'You are not authorization to delete.' });
            }
            const tokenExists = await tokenCollection.findOne({ token,uuid });
            //   console.log(tokenExists, typeof(uuid))
            if (!tokenExists) {
                return res.status(401).json({ message: 'You are not authorization to delete.' });
            }
        const deletedProject = await projects.findOneAndDelete({ _id: ObjectId(projectId) });
        if (!deletedProject.value) {
          return res.status(404).json({ message: 'Project not found' });
        }
        res.status(200).json({ message: 'Project deleted successfully' });
      } catch (err) {
        console.error('Error deleting project:', err);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    app.get('/', async (req, res) => {
        res.send('Jaber Portfolio Server is running');
    });

    app.listen(port, () => {
        console.log(`Jaber Portfolio Server is running on PORT: ${port}`);
    });