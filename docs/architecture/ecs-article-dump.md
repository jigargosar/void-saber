Building Games in ECS with Entity Relationships
Sander Mertens
Sander Mertens

Follow
12 min read
·
Apr 8, 2022
309


3



Press enter or click to view image in full size

Behavior in games is in many ways defined by the interaction between entities. A turret fires at an enemy, a player trades with another player, a hero goes on a quest that in turn belongs to a faction, a spaceship docks to a space station orbiting a planet in a star system and so on.

However common it is, these relationships between entities are rarely supported as first class citizens by a game engine or framework. Sure, you can store a reference to an Actor or GameObject, but what happens if that entity is deleted? What if my game needs to find all players that I’m trading with, and are allied with one or more of my enemies?

Code that lets you do these things is not fun to write and has a high risk of being thrown out as game mechanics are scrapped or new ones are introduced. This is where ECS relationships come in (if you don’t know yet what an Entity Component System is, check out the ECS FAQ).

Entity relationships are a fast, deeply integrated mechanism for creating entity graphs and graph queries, so applications don’t need to write bespoke data structures. While they may look complex to implement at first glance, they mostly reuse and tweak features that already exist in an ECS.

Sounds too good to be true? Let’s find out!

(Disclaimer: This blog is about entity relationships as they are implemented in Flecs. I’m the author of Flecs).

I split up the blog into two sections:

What are Entity Relationships
Querying for Relationships
Make sure to check the “live demo” links under the images, as they take you to an interactive editor that lets you try out the example.

So what are Entity Relationships?
If you are familiar with ECS basics, you’ll probably know that you can add and remove components, like in this example:

Press enter or click to view image in full size

entity.add<MeleeUnit>() [live demo]
or this, where we add a component with a value:

Press enter or click to view image in full size

entity.set<Position>({10, 20}) [live demo]
Both examples add one thing (the component) to one other thing (the entity). Some components store a value (like Position) whereas other components like MeleeUnit don’t (we usually refer to these components as “tags”).

So what do relationships add? Well, instead of adding one thing to an entity…

Relationships let you add a pair of two things to an entity
If that doesn’t sound groundbreaking right away, bear with me. For now this is what a relationship looks like in practice:

Press enter or click to view image in full size

entity.add<Likes, Dogs>() [live demo]
We didn’t add the component Likes or Dogs. We also didn’t add component Likes with value Dogs. We added a component (Likes, Dogs) , which is combined out of two components.

You could now be saying “but that’s something I can do in any ECS” and you would be right. If you happen to be coding in C++ or Rust, you’re just one template or generic away from doing exactly this:

entity.add< relation<Likes, Dogs> >();
So let’s consider something a little bit more novel (and useful):

Press enter or click to view image in full size

player_1.add<Attacks>(player_2) [live demo]
In this example player_2 is a regular entity, which means we can’t know its identifier before running the game. This is different from a regular component, which (in most ECS frameworks) has to be known at compile time. This brings us to the second defining feature of relationships:

2. Relationship pairs can contain regular entities

We can use this to implement things like entity hierarchies:

Press enter or click to view image in full size

Earth.add(ChildOf, Sun); Moon.add(ChildOf, Earth) [live demo]
Adding relationships for the most part looks pretty similar to adding regular components. They can even have values:

Press enter or click to view image in full size

entity.set<Eats>(Apples, {2}) [live demo]
These similarities don’t stop at the API. The data structures for storing relationships are exactly the same as for regular tags and components! This is a good thing™ ️as it means that all the performance benefits we’ve come to expect from using ECS components still apply to relationships.

To understand how this works let’s take a closer look at what happens when we add a component to an entity twice (we’ll get to why this is relevant in a second):

entity.add<MeleeUnit>();
entity.add<MeleeUnit>(); // already present, do nothing
In this example the second statement does nothing, as each entity can only have a single instance of a component. This is good: you wouldn’t want your entity to have, say, two positions.

The reason for this is that an ECS assigns a unique id to each component, and makes sure that each id can only be added once to an entity.

How does this apply to relationships? Well, this mechanism also works in reverse. We can keep adding components to an entity as long they all have unique ids. This is what relationships exploit in their third defining feature:

3. Each relationship pair corresponds with a unique component id

The details on how two elements of a relationship pair can be packed into a single identifier are explained in more detail in this article: Making the most of Entity Identifiers.

Wait, if each pair has a unique id, does that mean that…

4. Relationships make it possible to add a component multiple times

Indeed they do! Because (Likes, Dogs) and (Likes, Cats) correspond with different ids, we can add Likes twice to the same entity. This ends up being useful for all sorts of things, like an ECS-based animation system:

Press enter or click to view image in full size

animation.set<Start, Position>({0, 0}); animation.set<Stop, Position>({10, 20}) [live demo]
Or for keeping track of the number of items in an inventory:

Press enter or click to view image in full size

inventory.set<Item>(Coins, {30}); inventory.set<Item>(WoodenSword, {2}) [live demo]
In some cases though we may want to enforce that an entity only has a single instance of a relationship. A traditional (literally) example of this would be a MarriedTo relationship, for which we could want to enforce that an entity can only have one at a time. This brings us to the next defining feature:

5. Exclusive relationships swap out old instances with new instances

This comes in handy when using relationships to create hierarchies, as we typically want to enforce that each entity only has a single parent:

Press enter or click to view image in full size

child.add(ChildOf, parent_a); child.add(ChildOf, parent_b) [live demo]
Another way in which exclusive relations are useful is in combination with enumeration types. Enumerations are automatically treated as exclusive relations when they are added to entities as the next example shows:

enum Color {
Red, Green, Blue
};
// Add (Color, Red)
entity.add(Color::Red);
// Replace (Color, Red) with (Color, Green)
entity.add(Color::Green);
Press enter or click to view image in full size

entity.add(Color::Red); entity.add(Color::Green) [live demo]
What makes exclusive relations particularly useful is that you get two operations for the cost of one: removing the old instance and adding the new instance all happens in a single atomic operation.

Get Sander Mertens’s stories in your inbox
Join Medium for free to get updates from this writer.

Enter your email
Subscribe
This covers the basics of relationships. In summary:

Relationships lets you add a pair of two things to an entity
Relationship pairs can contain regular entities
Each relationship pair corresponds with a unique component id
Relationships make it possible to add a component multiple times
Exclusive relationships swap out old instances with new instances
In the next section we’ll look at how queries can benefit from relationships.

ECS Queries
One of the things that makes ECS a good fit for data intensive games is its ability to query entities in realtime. An ECS query in its most basic form finds all entities with a set of components, for example:

Position, Velocity
To understand how querying for relationships works lets first take a look at how Flecs evaluates queries in the following diagram:

Press enter or click to view image in full size

Evaluation of query “Position, Velocity” [live demo]
Queries are treated as a list of nodes. Each node implements a function that can return either true or false. When a node returns true, the query moves on to the next node. When a node returns false, it goes back one node. These kinds of functions are called predicates, and this evaluation process is called backtracking.

The diagram shows two predicates, “select” and “with”. Select is a function that finds all tables with a certain component (in this case Position) and returns true as long as it keeps finding tables. With returns true if the input table has a component (Velocity).

What is a table? Tables group entities with the same components. This is useful for queries, as it lets us eliminate many entities with a single operation. By contrast a sparse set ECS uses the same query algorithm but needs to run predicates for each individual entity.

Another advantage of tables is that while entities move between tables all the time, tables themselves are pretty stable. This means queries can (and do) cache matching tables, which eliminates almost all search overhead from the main loop.

Relationship queries
Ok, now that we got that out of the way we can circle back to relationships. Say we want to find all spaceships that are docked to Earth and their positions. Our query looks like this:

SpaceShip, Position, (DockedTo, Earth)
The first two terms (“SpaceShip”, “Position”) are regular components. The third term is where the relationship shows up. How do we evaluate this? Here’s the diagram for it (edge labels omitted for brevity):

Press enter or click to view image in full size

Evaluation of query “SpaceShip, Position, (DockedTo, Earth)” [live demo]
Note how similar this diagram looks. The relationship shows up just like a regular component! Like we saw earlier, relationships are encoded as component ids, which means this is business as usual for queries.

This by itself is not groundbreaking. We could just as easily have created a component called “DockedToEarth” and not use relationships at all.

Wildcard Queries
But that’s not all we can do. Often we don’t know in advance what the relationship target (“Earth”) is going to be. Our query will in this case have to use wildcards. This query looks for spaceships docked to anything:

SpaceShip, Position, (DockedTo, *)
Its diagram:

Press enter or click to view image in full size

Evaluation of query “SpaceShip, Position, (DockedTo, *)” [live demo]
Here is where things get a bit more interesting. (DockedTo, *) is not a component id in the way that (DockedTo, Earth) is. You would never add (DockedTo, *) to an entity. So why does this diagram still look the same?

To understand this we first need to know how the query was able to find all tables with “SpaceShip” or “Position” in the first place. It can do this because Flecs indexes tables for each component. Table [SpaceShip, Position, (DockedTo, Earth)] gets added to the indices for SpaceShip, Position and (DockedTo, Earth).

Without getting too specific, this index roughly looks like this:

map<component_id, set<table_id>> id_index
If I want to get all tables with SpaceShip (select) I do:

tables = id_index[ SpaceShip ]
If I want to know whether a table has Position (with) I do:

id_index[ Position ].has(table.id)
Both are fast O(1) operations, which is why queries evaluate as quickly as they do. To get all tables with (DockedTo, Earth) you’d do:

tables = id_index[ pair(DockedTo, Earth) ]
The trick to evaluating wildcards is that we pretend that (DockedTo, *) is a component by creating an index for it. To get all tables with (DockedTo, *), we do the same as we do for any other component:

tables = id_index[ pair(DockedTo, Wildcard) ]
This is convenient, as it means that all relationship queries we’ve seen so far actually don’t need to know anything about relationships at all!

Querying the Graph
So far our relationship queries have been shallow, that is they don’t actually traverse the graph of entity relationships. We can query for all spaceships docked to Earth or docked to anything, but what if we want to query for all spaceships that are docked to a Planet?

This would require us to match the Planet component, but not on the spaceship itself. We need to match it on the target of the DockedTo relationship. To do this we need two things:

Allow the nodes in a query to match on different entities
Allow the entity matched by a node to be determined at evaluation time
Let’s unpack this for a moment. The first ability is easy to understand with an example. Consider the following query:

Position, Velocity, TimeScale(Game)
The interesting bit here is theTimeScale(Game) notation. What we do here is specify the source for the TimeScale component. Instead of matching TimeScale on the same entity that has Position and Velocity, we explicitly instruct the query to match it on the Game entity.

We call this a fixed source, as it is determined when the query is created. We will never match TimeScale on any other entity than Game. The opposite of a fixed source is a variable source. Position and Velocity have a variable source as we can’t tell in advance on which entities they will be matched.

This brings us to the second ability, which is to figure out the entity we want to use for matching while we are evaluating the query. To specify a variable source in Flecs we use something called a query variable.

When no source is specified, a query implicitly uses a builtin variable called “This”. We can see what this looks like (no pun intended) by rewriting the query and specifying the source for each term explicitly:

Position($This), Velocity($This), TimeScale(Game)
In this query, $This is populated by the select(Position) predicate, and read by the with(Velocity) predicate. This is why Position and Velocity are matched on the same entity: the nodes operate on the same source.

Armed with query variables, we can now find all spaceships docked to a planet. Consider the following example:

SpaceShip, (DockedTo, $Planet), Planet($Planet)
By replacing the wildcard with the $Planet variable, we can use its value as source for the next node, in which we test if it is a planet. Here is what that looks like in a diagram, with annotations added for reading/writing the query variables:

Press enter or click to view image in full size

Evaluation of query “SpaceShip, (DockedTo, $Planet), Planet($Planet)” [live demo]
Variables let us create queries that match entity graphs of any depth. What if we wanted to find spaceships docked to planets that are ruled by a faction that is allied with the faction of the spaceship? We’d do:

SpaceShip($spaceship),
Faction($spaceship, $spaceship_faction),
DockedTo($spaceship, $planet),
Planet($planet),
RuledBy($planet, $planet_faction),
AlliedWith($spaceship_faction, $planet_faction)
We can visualize the graph that is traversed by this query:

Press enter or click to view image in full size

Query evaluation graph [live demo]
The ability to run queries like these directly on the ECS and to do so efficiently can be a big advantage when developing games. Without queries a game would either have to do a slow brute force search or write bespoke data structures for each set of entities that is required by game systems. ECS queries on the other hand already use fast data structures for finding entities, and with the few tweaks we discussed here they can be extended to general-purpose query engines for graphs.

Perhaps an even more tangible benefit is that queries don’t have to be baked into the game code. They can be used during testing and development to verify that the state of the game is valid, or to inspect a running instance of the game. They can be created by modders after shipping to extend a game with new features or in multiplayer games to request a specific selection of entities from a game server. And so on.

Conclusion
Thanks for making it all the way down! I hope this gave you a good overview of what ECS relationships are, how they work, and how they can benefit game development. It’s a cliche to say that this only covers the top of the iceberg, but it is nonetheless true.

There are lots of interesting aspects that we haven’t gone over yet like transitivity, constraints, best practices, reflection, cleanup policies and hierarchies. If you’d like to dig deeper, check out the Flecs relations manual and examples in C and in C++!

You can find the Flecs repository here: https://github.com/SanderMertens/flecs

To find out how gamedevs are using relationships, check the Flecs discord: https://discord.gg/DxsRBkmJ

Game Development
Software Development
Entity Framework
Entity Component System
Design Patterns
309


3


Sander Mertens
Written by Sander Mertens
876 followers
·
514 following
Author of Flecs, an Entity Component System for C and C++


Follow
Responses (3)

Write a response

What are your thoughts?

Cancel
Respond
ppan 🍳
ppan 🍳

Jan 18, 2023


Great article as always! Looking forward to reading more on ecs!
Reply

Gabriel Barbosa
Gabriel Barbosa

Apr 29, 2022


I remember playing with Prolog a few years ago. Would this be anything similar to it? At first it certainly feels so.

1 reply

Reply

themagicalmilk
themagicalmilk

Apr 11, 2022


Every time I read one of your articles I'm dumbfounded by the level of abstraction one can create from simple ids. Anyhow, awesome article like usual!
Reply

More from Sander Mertens
Building an ECS #2: Archetypes and Vectorization
Sander Mertens
Sander Mertens

Building an ECS #2: Archetypes and Vectorization
This is the second in a series of posts about the guts of Flecs, an Entity Component System for C and C++. Each post will cover a…
Mar 14, 2020
323
8
Building an ECS #1: Where are my Entities and Components
Sander Mertens
Sander Mertens

Building an ECS #1: Where are my Entities and Components
This is the first in a series of posts about how to build an Entity Component System. Each post will cover a different part of the design…
Aug 7, 2022
223
3
Building an ECS: Storage in Pictures
Sander Mertens
Sander Mertens

Building an ECS: Storage in Pictures
A visual deep dive into the internals of an Entity Component System
Sep 14, 2024
295
4
Doing a lot with a little: ECS identifiers
Sander Mertens
Sander Mertens

Doing a lot with a little: ECS identifiers
Tricks to get the most out of your bits
Jul 22, 2020
291
1
See all from Sander Mertens
Recommended from Medium
6 brain images
Write A Catalyst
In

Write A Catalyst

by

Dr. Patricia Schmidt

As a Neuroscientist, I Quit These 5 Morning Habits That Destroy Your Brain
Most people do #1 within 10 minutes of waking (and it sabotages your entire day)

Jan 15
32K
587
I Thought I Knew System Design Until I Met a Google L7 Interviewer
Beyond Localhost
In

Beyond Localhost

by

The Speedcraft Lab

I Thought I Knew System Design Until I Met a Google L7 Interviewer
A single whiteboard question revealed the gap between knowing patterns and actually designing systems that scale.

Dec 22, 2025
5.2K
98
Stop Memorizing Design Patterns: Use This Decision Tree Instead
Women in Technology
In

Women in Technology

by

Alina Kovtun✨

Stop Memorizing Design Patterns: Use This Decision Tree Instead
Choose design patterns based on pain points: apply the right pattern with minimal over-engineering in any OO language.

Jan 29
4.7K
40
Apple Just Fired the Designer Who Made iOS 26 Unreadable. Here’s What Truly Happened.
Mac O’Clock
In

Mac O’Clock

by

Nov Tech

Apple Just Fired the Designer Who Made iOS 26 Unreadable. Here’s What Truly Happened.
Now he’s going to Meta, Stephen Lemay is taking over, and Apple employees are publicly celebrating. Here’s the full story.

Dec 22, 2025
8.3K
303
Junior Devs Use try-catch Everywhere. Senior Devs Use These 4 Exception Handling Patterns
Stackademic
In

Stackademic

by

HabibWahid

Junior Devs Use try-catch Everywhere. Senior Devs Use These 4 Exception Handling Patterns
Try-catch on every method? That’s not safe code — that’s a ticking time bomb. Here’s what senior devs do instead.

Feb 2
544
16
Screenshot of a desktop with the Cursor application open
Jacob Bennett
Jacob Bennett

The 5 paid subscriptions I actually use in 2026 as a Staff Software Engineer
Tools I use that are (usually) cheaper than Netflix

Jan 19
3.4K
82
See more recommendations
Help

Status

About

Careers

Press

Blog

Privacy

Rules

Terms

Text to speech