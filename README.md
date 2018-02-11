# Zombie Simulator

Simulation of the zombie apocalypse the spread of zombie-ism.

In this visualization, green dots are zombies, pink dots are humans, and yellow dots are people who are panicking. The gray areas are buildings. The outbreak started from a single zombie.

The provided simulation defines a few different kinds of agents. Most of the agents are "**humans**" (**pink**), who move around the city and in and out of buildings at random. "**Zombies**" are **green**, and they move more slowly and change direction more frequently than humans. If a zombie see an agent in front of it, it moves in that direction without turning. After a time without seeing anything, the zombie will lose interest and start turning randomly. If a zombie moves next to a human, it will "**bite**" the human and immediately turn that human into another zombie! If a human sees a zombie in front of it, he beings to **panic** (turning **yellow**). Panicked humans run even faster. If a panicked human doesn't see a zombie for a short time, he stops being panicked. If a human sees another person who is panicked, they too become panicked (panic is also contagious in the zombie apocalypse). In this model, a single zombie can infect the rest of the city, leaving nothing but small herds of zombies clustered together looking for food.
