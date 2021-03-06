# Introduction

Telepat is an open-source API platform, designed to deliver information and information updates in real-time to clients, while allowing for flexible deployment and simple scaling.

Let’s break that down:

### Open-source

We believe that the massive proliferation of free software we’ve witnessed in the last decades is changing the face of the world as we know it. Today’s open source components - created, tested and maintained by international communities - are the main driver that stands behind the rise of a myriad of new products and services, that could have never iterated or scaled with such agility without relying on the solid foundations that such components provide.

### API platform

The operations of storing, retrieving and manipulating data constitute the core layer for most of today’s software products. The modern, multi-platform embodiment of this layer is the API. While this is basically an orchestrator between various database, processing and transport services, there is significant effort required in setting up all the connecting boilerplate code. This amount of boilerplate needed makes it unfeasible to test several database components, for example, to find the perfect fit for specific use cases. And while there are now many services and stacks that significantly accelerate this part of development, most of them don’t provide any choice as to the specific components used behind the scenes.

### Real time

The standard model that has powered web services for years now is pull-based - that is, clients ask the server for the information they need and the server responds with a static snapshot of the data that marks the end of the transaction. Refreshing this stale data means the client needs to request all of the information yet again, in another transaction. While this has been sufficient in most cases until now, the rise of the social web and the on-demand economy is marking the transition to a new paradigm, where data needs to be actively pushed from the backend to all subscribing clients in real-time.

### Flexible deployment

Software components that handle backend services have a great value offering for developers, as they significantly reduce the effort required for setting up a new project. However, an equal amount of attention needs to be given to taking those projects from early development to later production stages, where apps need to be deployed on various infrastructures, from self-managed machines to cloud providers. Modularization and flexibility in component choice needs to be complemented by flexibility in deployment options, in order to provide safety and simplicity for the whole project lifecycle.

### Simple scaling

Probably the most important aspect in the design of a system that has real-time ambitions is the ability to rapidly and easily scale each level of the architecture in a mode that’s responsive to the workload the system is instantly under. From the database to the workers serving requests, all of the nodes that make up the system need to have reliable underlying scaling strategies that focus on uptime and availability even in the situation of rapid traffic surges.

# Goals

Telepat is designed as a multi-layer system, with the following main objectives in mind:

*   Data should be stored and transmitted in JSON format.
*   Schema should be defined, in order to provide means of searching and filtering information. Objects should have a `type` property that allows querying.
*   The main focus of the system is orchestrating CRUD operations on data, and persisting as well as replicating changes as soon as possible on all subscribed clients.
*   All data in the system should be retrievable by object type. Real-time filtering based on object property values (e.g. comment.post_id = 5 or text searches like comment.text contains “word”) should also be available.
*   The system should be able to ingest large volumes of operations on data.
*   Large spikes in the number of operations over short time intervals should be handled gracefully, without any data loss and without causing the public facing layer to become unresponsive.
*   Layers that handle specific tasks, like the data queue or the persistence layer, should be abstracted away from the actual implementation, thus allowing the use of many components such as open-source solutions or cloud services.
*   Deploying, operating and monitoring the system as a whole should be simple, from development to production stages.
*   Each layer should be individually scalable and configurable.
*   The system should be able to handle device and user identification and registration operations.
*   Data modeling should also support graph-like relationships between objects, for advanced real-time querying.

Other objectives that have shaped the design of Telepat are:

*   It should work natively on desktop as well as mobile platforms.
*   Native push notifications should be supported out of the box.
*   Client libraries should be readily available for all major platforms and languages.
*   Client libraries should allow developers to directly work with data represented as native objects. Code callbacks should be asynchronously triggered when any update is made to objects that clients are subscribed to.
*   Client libraries should also use a local persistence layer for offline availability.
*   The system should implement access control lists for objects.

# Information design

*   All information in the Telepat system is encoded using **JSON objects**.
*   All updates of object properties are retrieved from and sent to clients using a variant of [**JSON Patch**](https://tools.ietf.org/html/rfc6902) that also supports value incrementation and decrementation.
*   Objects exist in the scope of **applications** and **contexts**. A single application can contain multiple contexts, and contexts contain multiple objects.
*   All objects belong to specific **types**, defined by an app-level **schema**.
*   The schema may also define object **properties**. While this is optional (objects are processed and stored as JSON), properties need to be defined if filtering is needed at a level deeper than just object type.
*   **Relationships** between objects (e.g. “has many”) may also be defined for filtering purposes.
*   A basic **subscribe** binds a client to a specific object type, within a specific context.
*   Advanced **filtering** may be performed on objects, based on defined properties and relationships. The performance of running advanced filters depends on the component chosen to implement the persistence layer.
*   **ACLs** are defined for each object type. Read or write permissions can be assigned to anonymous devices, logged-in users or administrators.
*   Access control is also defined for objects on a per-property basis.

# Architecture

Telepat implements a microservice architecture, with a messaging broker at the core, orchestrating communications between loosely coupled, highly focused data processing services.

Telepat runs on top of the following set of 3rd party dependencies:

*   A message broker of choice
*   A database of choice (supporting JSON storage)
*   A [Redis](http://redis.io/) instance, holding internal Telepat state and configuration data.

The components that make up the architecture of Telepat are:

*   The API endpoint
*   The messaging queue
*   The data processing services
*   The persistence service
*   The synchronization service

All server-side services are implemented in JavaScript, on top of [Node.js](https://nodejs.org/). Clients for the API endpoint are available for multiple platforms and programming languages.

### The API endpoint

![](http://docs.telepat.io/images/schema_01@2x.png)

Powered by [Express](http://expressjs.com), this is a core component of Telepat and the main entry point to the system. All operations that allow clients to interact with the information are made via HTTP requests to these endpoints. The main operations available are:

*   Device registration
*   User login
*   Subscription to object of a certain type, within a specified context
*   Updates of objects properties
*   Creation and deletion of objects

The endpoints also expose system administration functionality:

*   Registering new administrator accounts
*   Creating, editing and removing applications
*   Creating, editing and removing contexts
*   Creating, editing and removing schemas

The API endpoint acts like an information dispatcher, and communicates directly with:

*   The persistence service, to instantly serve the current information snapshot to clients that make requests
*   The data queue, where all object updates received from clients are stored for aggregation

### The data/messaging queue

![](http://docs.telepat.io/images/schema_03@2x.png)

The data queue layer intermediates communication between all Telepat components, and has multiple purposes:

*   It acts like a buffer for all the object updates signaled by clients, thus enabling the API endpoint to be write-decoupled from the persistence service, to enhance performance and responsiveness.
*   It allows the periodic aggregation of updates on same objects, so that, for example, 50 updates of a specific object’s property received almost instantly are translated to a single database write and a single update message sent to subscribing clients.
*   It also works as an internal job dispatching queue, for tasks that need to be executed asynchronously, without blocking the system (for example, sending aggregated updates back to clients).

This layer is implemented using 3rd party components or services.

### Data processing services

![](http://docs.telepat.io/images/schema_02@2x.png)

Data processing is achieved by plugging microservices into the data pipeline. Event processing, triggering alerts, tagging objects or extracting trending content in real-time are examples of what such services can provide.

The aggregation service comes out of the box with Telepat. Implemented using [Node.js](https://nodejs.org/), it continuously fetches data updates enqueued in the data broker, and merges them into larger chunks that constantly reflect the latest object states and are ready for persisting and sending to subscribing clients. The chunks are also temporarily stored using the persistence service.

### The persistence service

![](http://docs.telepat.io/images/schema_05@2x.png)

This is implemented using 3rd party components or services that plug into Telepat using adapters. It handles storing and retrieving all information that runs though Telepat. The constraint imposed by this service is using components that support storing JSON objects in a key-value fashion.

Also, depending on the types of filtering that the application will require, some components may have better performance than others (in doing, for example, full text searches over stored objects).

### The synchronization service

![](http://docs.telepat.io/images/schema_04@2x.png)

This is also a core part of Telepat, implemented using [Node.js](https://nodejs.org/). The job of the synchronization service is to monitor the data queue for signals that new aggregated updates are available and ready for deployment.

When receiving such signals, this service does two things:

*   It writes the data to the persistence service, thus permanently storing the new state of the information
*   It sends the data to all current subscribers. This is done using communication adapters, responsible exclusively for the push transport of the information, from the synchronization nodes to the clients.

Transport adapters are implemented using 3rd party components or services. There are two types of possible adapters, that serve the purpose of reliably communicating with client devices:

*   Permanent transports - basically nodes that send push notification to devices that are able to receive them. These allow performing data synchronization within apps that are not in current active use, such as mobile applications that are backgrounded or inactive.
*   Volatile transports, implementing communication using websockets for applications that are currently active or within platforms that do not support push notifications, such as websites.

# Use cases

Telepat is designed to be a best fit for applications that:

*   Are data-driven
*   Need to have data updates instantly reflected in user interfaces
*   Need a solid backend stack that handles all common data operations
*   Require fast development iterations but also need to be able to scale when deployed in production
*   Need to be highly available
*   Need to process large amounts of data operations without downtime and without losing information
*   Require flexibility regarding the choice of software components
*   Require flexibility regarding the infrastructure chosen for production

Some examples of applications that can make good use of Telepat are:

### Second-screen companion apps

Telepat shines when it comes to traffic spikes like ones you get during a popular live tv show, in a companion app that allows interaction. Here's an example of handling common usage scenarios for second-screen apps:

*   Users log in to Telepat using their Facebook accounts. Shows are represented by contexts inside Telepat, so after login, users start listening for global context changes, as that would signal that a new show is currently available for "check-in".
*   Once a context becomes available, users can subscribe to "event" objects on that specific context - that's basically the "check-in" process, after the subscribe, users will be notified of any new events, as they happen live.
*   Admins publish events on Telepat, marking importent moments in the show timeline. Events are generic JSON objects, they can be used to encapsulate not just text but also images, videos, maps or any other content.
*   Besides being able to push second-screen content in real-time to viewers, admins can also allow them to interact by participating on polls. Polls can be special types of events, and could also have a series of extra properties to store the possible answers and each answer count.
*   When receiving this special type of event, users are able to vote by sending increment operations on properties holding vote counts.
*   Increments are scalably queued and aggregated by Telepat, and updated values are sent to all subscribers that are able to see the massive voting results in real-time.

### IoT, sensor tracking, geo tracking

Any device that talks HTTP can also talk to Telepat. Basic communication (registering, logging in, administration tasks and data objects CRUD) is classically implemented using client-server HTTP requests. Real-time data object updates are sent via platform-specific adapters, but any device can fallback to HTTP long-polling.

Sensors can individually or collaboratively work on data objects that are replicated in real-time to all subscribing devices, allowing Telepat to become:

*   An inter-device synchronization and communication layer, allowing the implementation of logic like blinking a LED when values read from a sensor exceed a certain threshold.
*   A data management layer, allowing the collection and search of generic JSON data objects according to rules described by a schema. Telepat can also be scaled to handle large, enterprise-level data volumes coming from many individual sensors.
*   A real-time data visualization layer, built for the web using the Telepat JavaScript client.

### Messaging and chat

Making a public, many to many chat app is simple. But what if you want to build a chat system to allow users to talk 1-on-1 with their Facebook friends? Let's consider an example of two friends, Alice and Bob, doing just that using Telepat. We'll name devices after their users, just to keep thing simple.

*   First, Bob logs in to Facebook, and he receives his authentication token.
*   Bob then logs in to Telepat, using the authentication token from Facebook.
*   When connected, Bob gets a list of his Facebook friends that also have Telepat user accounts (i.e. friends of his that have already logged in to Telepat)
*   To initiate a conversation, Bob creates a new "conversation" object, then adds Alice to the array of object owners for the new object. The permissions are set so that the object is only visible for the owners.
*   If Alice is also connected (and subscribed to her conversations on Telepat), she is instantly notified about the new conversation with Bob. Here, you could use a boolean on the conversation object to allow Alice to "accept" the request before chatting.
*   Two booleans on the conversation object could indicate if anyone is typing at the moment. The second Bob starts typing, he also sets his boolean to true, and that's instantly reflected in Alice's local version of the object, and then in the interface.
*   When Bob finishes typing, he'll add a new "message" object to Telepat. Conversations are connected to messages with a "has many" relationship, so Bob will set the parent_id of the new message to the conversation object id.
*   Alice is not only subscribed to her conversations, but also to messages for each of those conversations, so she instantly gets a callback notifying her of the new message. Since messages are generic JSON objects, they can be used to encapsulate not just text but also images, videos, maps or any other content.
*   Alice also gets notified whenever any object changes, so you might as well allow users to edit their messages as a bonus feature!

### Social gaming

But after hooking up their conversation, why not let them engage more? Here's how Bob and Alice could play a fast game of tic-tac-toe together, using Telepat:

*   After logging in with Facebook and connecting to Alice like in the chat example, Bob adds a new message with a specific "type" property value, indicating that he wants to play tic-tac-toe.
*   The object has additional properties, modeling each space being marked (and by who) on not. Also, Alice is added to the message object owners, allowing her to make edits on the object.
*   Bob and Alice take turns editing properties of the shared object as they mark spaces. They each get instantly notified on any edits to the object, and are able to update the game interface smoothly.
*   When one of them wins, why not add some properties on the main conversation object, allowing them to persistently keep score of the games they played?

### On-demand economy

So how would you build your basic Uber-like service, where demand meets supply in real time, over Telepat? Let's look at the flow of data.

*   Users log in to Telepat using their Facebook accounts. Every user has access to the object representing his own profile - it's here where you can hold a variable to distinguish "buyers" from "sellers".
*   Buyers place orders by creating "order" objects in Telepat. An order contains basic identification information about the customer, plus additional details about the order (like the buyer's geocoordinates, or preferences).
*   All sellers are subscribed to orders, and learn about new ones in real time. They could also use a filter on orders, to only get ones issued near them for example.
*   Any seller can add "offer" objects in Telepat, containing identification information and offer details. Orders are related to offers with a "has many" relationship, so the offer object will need to have the parent_id value set to the proper order object id.
*   Buyers subscribe to offers related to their own orders, and are notified instantly about new ones.
*   When a buyer decides for an offer, he can delete the original order object or he can close it, using a status variable - in both cases, all sellers get callbacks about the change, so they know the order has expired.
*   The buyer then creates a new "booking" object in Telepat, makes it private and adds the seller user id to the list of the booking's owners. Buyers subscribe to bookings, so the lucky winner instantly knows about his new deal.
*   The booking object is then shared between the two users, facilitating real-time exchange between them until the service has been delivered and the process is done.

# Comparison

Like other software components out there, open-source or web services, Telepat is also meant to accelerate the development of modern web and mobile applications, while focusing on providing real-time data update functionalities to developers. Many of these components are easy to use, elegant and solid, but there are a lot of aspects that set them apart, so it always makes sense to investigate what the best solution is for your specific requirements.

Let's take a look at what sets Telepat apart from the most popular existing solutions.

* * *

[![](http://docs.telepat.io/images/firebase-logo.png)](https://www.firebase.com/)

*   Firebase is a service that is very similar to Telepat's interface design, and a point of inspiration for it. Firebase is focused on the backend functionality, is unopinionated on the frontend and can have native clients for specific platforms.
*   Like Telepat, Firebase also supports structured data management, but has an approach based on key path subscribing, which makes complex queries difficult to model data for.
*   Unlike Telepat, Firebase does not support native push notifications for mobile devices or browsers.
*   User authentication is offered by both Firebase and Telepat. However, managing users and relationships between users is not a focus for Firebase, but can be modeled with extra effort using the basic functionalities provided.
*   Firebase is closed-source software.

* * *

[![](http://docs.telepat.io/images/pubnub-logo.png)](https://www.pubnub.com/)

*   PubNub is a global data stream network, offered as a service.
*   PubNub, unlike Telepat, is not concerned with understanding the data it handles, but focuses on delivering it to subscribers across platforms, with extremely low latency.
*   PubNub has no object data models, and is not aware of any changes happening with the data. An extra layer of business logic needs to be added on top of PubNub to handle change syncronization or data querying.
*   Telepat's [synchronization service](#the-synchronization-service) handles dispatching all data changes to corresponding subscribers, in the form of JSON Patch objects. Out of the box Telepat uses Socket.io, but services like PubNub (and other dedicated streaming networks) can also be integrated via adapters, to work together with Telepat and speed up delivery of updates.

* * *

[![](http://docs.telepat.io/images/meteor-logo.png)](https://www.meteor.com/)

*   Meteor is a solution for both frontend and backend development, while Telepat focuses on backend functionality.
*   When using Meteor in the backend, you also need to use it in your frontend app. Telepat lets you use any frontend framework.
*   Decoupling the default Meteor frontend components means using a custom, specific interface (DDP).
*   Meteor is a solution for creating webapps, and running on mobile devices works only via webviews. Telepat enables native clients and native functionality for mobile or embedded.
*   Meteor uses database polling or oplog tailing to provide real-time updates. Telepat monitors and aggregates updates before adding them to the database, thus achieving greater database and overall performance.
*   Telepat is focused on creating individually scalable service layers. Meteor has a traditional, monolith design.
*   Telepat allows using adapters for 3rd party databases, messaging queues and push transports.
