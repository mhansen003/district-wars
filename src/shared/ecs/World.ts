// ECS World — Container for all entities and their components

import type { EntityId } from '../types';

type ComponentClass = new (...args: unknown[]) => unknown;

export class World {
  private nextEntityId: EntityId = 0;
  private entities: Map<EntityId, Map<Function, unknown>> = new Map();
  private entitiesToRemove: EntityId[] = [];

  createEntity(components: object[]): EntityId {
    const id = this.nextEntityId++;
    const componentMap = new Map<Function, unknown>();
    for (const component of components) {
      componentMap.set(component.constructor, component);
    }
    this.entities.set(id, componentMap);
    return id;
  }

  /** Mark entity for removal (processed at end of tick to avoid iteration issues) */
  markForRemoval(id: EntityId): void {
    this.entitiesToRemove.push(id);
  }

  /** Remove entity immediately */
  removeEntity(id: EntityId): void {
    this.entities.delete(id);
  }

  /** Flush all entities marked for removal */
  flushRemovals(): void {
    for (const id of this.entitiesToRemove) {
      this.entities.delete(id);
    }
    this.entitiesToRemove = [];
  }

  getComponent<T>(entityId: EntityId, componentClass: new (...args: any[]) => T): T | undefined {
    return this.entities.get(entityId)?.get(componentClass) as T | undefined;
  }

  hasComponent(entityId: EntityId, componentClass: Function): boolean {
    return this.entities.get(entityId)?.has(componentClass) ?? false;
  }

  addComponent(entityId: EntityId, component: object): void {
    const map = this.entities.get(entityId);
    if (map) {
      map.set(component.constructor, component);
    }
  }

  removeComponent(entityId: EntityId, componentClass: Function): void {
    this.entities.get(entityId)?.delete(componentClass);
  }

  /** Query all entities that have ALL of the specified component types */
  query(...componentClasses: Function[]): EntityId[] {
    const results: EntityId[] = [];
    for (const [id, components] of this.entities) {
      if (componentClasses.every(cls => components.has(cls))) {
        results.push(id);
      }
    }
    return results;
  }

  /** Check if an entity still exists */
  exists(entityId: EntityId): boolean {
    return this.entities.has(entityId);
  }

  get entityCount(): number {
    return this.entities.size;
  }
}
