import type { Extension, ExtensionHook, HookName, HookPayload } from '@/types/extensions'

class ExtensionRegistry {
  private extensions: Map<string, Extension> = new Map()
  private hooks: Map<HookName, ExtensionHook[]> = new Map()

  register(extension: Extension): void {
    if (this.extensions.has(extension.id)) {
      throw new Error(`Extension ${extension.id} is already registered`)
    }

    this.extensions.set(extension.id, extension)

    // Register hooks
    extension.hooks.forEach((hook) => {
      const hookList = this.hooks.get(hook.name as HookName) || []
      hookList.push(hook)
      this.hooks.set(hook.name as HookName, hookList)
    })

    console.log(`✅ Extension registered: ${extension.name} v${extension.version}`)
  }

  unregister(extensionId: string): void {
    const extension = this.extensions.get(extensionId)
    if (!extension) {
      return
    }

    // Remove hooks
    extension.hooks.forEach((hook) => {
      const hookList = this.hooks.get(hook.name as HookName) || []
      const filtered = hookList.filter((h) => h !== hook)
      this.hooks.set(hook.name as HookName, filtered)
    })

    this.extensions.delete(extensionId)
  }

  getExtension(extensionId: string): Extension | undefined {
    return this.extensions.get(extensionId)
  }

  getEnabledExtensions(): Extension[] {
    return Array.from(this.extensions.values()).filter((ext) => ext.enabled)
  }

  async executeHook<T = any>(hookName: HookName, payload: HookPayload<T>): Promise<T> {
    const hookList = this.hooks.get(hookName) || []

    let result = payload.data

    for (const hook of hookList) {
      try {
        const hookResult = await hook.handler({ ...payload, data: result })
        if (hookResult !== undefined) {
          result = hookResult
        }
      } catch (error) {
        console.error(`Error executing hook ${hookName}:`, error)
      }
    }

    return result
  }

  hasHook(hookName: HookName): boolean {
    const hookList = this.hooks.get(hookName) || []
    return hookList.length > 0
  }
}

export const extensionRegistry = new ExtensionRegistry()
