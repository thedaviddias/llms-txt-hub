export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
        }
      }
    }
  }
}
