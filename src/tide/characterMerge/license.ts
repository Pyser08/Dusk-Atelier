import { sanitizeCardValue, type CardFields } from '../characterUpdate'

/** Import/merge permissions belong to the target, including field absence. */
export function preserveTargetLicense(card: CardFields, target: CardFields): void {
    if (Object.hasOwn(target, 'license')) card.license = sanitizeCardValue(target.license)
    else delete card.license
}
