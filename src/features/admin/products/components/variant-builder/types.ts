export interface BuilderOption {
  id: string
  value: string
}

export interface BuilderGroup {
  id: string
  name: string
  options: BuilderOption[]
}
