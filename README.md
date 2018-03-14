# Zombie Simulator

Simulation of the zombie apocalypse the spread of zombie-ism.

In this visualization, green dots are zombies, pink dots are humans, and yellow dots are people who are panicking. The gray areas are buildings. The outbreak started from a single zombie.

The provided simulation defines a few different kinds of agents. Most of the agents are "**humans**" (**pink**), who move around the city and in and out of buildings at random. "**Zombies**" are **green**, and they move more slowly and change direction more frequently than humans. If a zombie see an agent in front of it, it moves in that direction without turning. After a time without seeing anything, the zombie will lose interest and start turning randomly. If a zombie moves next to a human, it will "**bite**" the human and immediately turn that human into another zombie! If a human sees a zombie in front of it, he beings to **panic** (turning **yellow**). Panicked humans run even faster. If a panicked human doesn't see a zombie for a short time, he stops being panicked. If a human sees another person who is panicked, they too become panicked (panic is also contagious in the zombie apocalypse). In this model, a single zombie can infect the rest of the city, leaving nothing but small herds of zombies clustered together looking for food.

## Playground

https://zicodeng.github.io/zombie-simulator/

## Justification for Template Pattern

`moveAll` method in both `City` and `Building` class is made of 3 parts:

1.  look around: having the agents react to others they can see
2.  move agents: having the agents change positions
3.  interact: having the agents interact with others

We can see that `moveAll` has very similar functionality and produce similar output across both classes. It is also worth noting that `moveAll` requires those 3 parts, and they need to be executed in order. Therefore, we can reasonably infer that for future class that might also need this `moveAll` functionality, it must also implement those 3 parts and place them in the exact order. However, the exact behavior of this method might be different depending on how those 3 parts are implemented. So we need a pattern that allows us to define what a particular method should be composed of, and what execution order those parts should be placed, while also gives the client the ability to modify those parts. Essentially, we want to create a template for a method. This is why I chose the **template pattern** for refactoring `moveAll`

To implement this pattern, I divided `moveAll` into 3 subfunctions: `lookAround`, `moveAgents`, and `interact`. To avoid code duplication, I gave `lookAround` and `interact` default code. To avoid behavioral duplication, I defined `moveAll` in `Area`, and also placed the 3 subfunctions described above in a specific order. If clients want a different behavior of `moveAll`, they can still do so by overriding any subfunctions.
