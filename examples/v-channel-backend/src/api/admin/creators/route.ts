import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { CREATOR_PROFILE_MODULE } from "../../../modules/creator-profile"
import CreatorProfileModuleService from "../../../modules/creator-profile/service"

/**
 * GET /admin/creators
 *
 * Lists creator profiles for the V-Channel admin dashboard.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<CreatorProfileModuleService>(
    CREATOR_PROFILE_MODULE
  )
  const [creators, count] = await service.listAndCountCreatorProfiles(
    req.filterableFields,
    {
      skip: req.queryConfig?.pagination?.skip ?? 0,
      take: req.queryConfig?.pagination?.take ?? 20,
    }
  )
  res.json({
    creators,
    count,
    offset: req.queryConfig?.pagination?.skip ?? 0,
    limit: req.queryConfig?.pagination?.take ?? 20,
  })
}

type CreateCreatorBody = {
  customer_id: string
  slug: string
  display_name: string
  bio?: string
}

/**
 * POST /admin/creators
 *
 * Creates a creator profile linked to an existing customer.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<CreateCreatorBody>,
  res: MedusaResponse
) => {
  const { customer_id, slug, display_name } = req.body
  if (!customer_id || !slug || !display_name) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "customer_id, slug and display_name are required."
    )
  }

  const service = req.scope.resolve<CreatorProfileModuleService>(
    CREATOR_PROFILE_MODULE
  )

  const existing = await service.getBySlug(slug)
  if (existing) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `A creator with slug "${slug}" already exists.`
    )
  }

  const creator = await service.createCreatorProfiles(req.body)
  res.status(201).json({ creator })
}
