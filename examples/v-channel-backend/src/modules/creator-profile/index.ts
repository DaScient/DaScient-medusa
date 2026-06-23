import { Module } from "@medusajs/framework/utils"
import CreatorProfileModuleService from "./service"

export const CREATOR_PROFILE_MODULE = "creator_profile"

export default Module(CREATOR_PROFILE_MODULE, {
  service: CreatorProfileModuleService,
})

export { CreatorProfileModuleService }
