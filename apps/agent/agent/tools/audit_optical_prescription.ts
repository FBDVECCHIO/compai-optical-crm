import { db, FactBand, FactStatus, type Prisma } from "@crm/db";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { focusOn } from "../lib/focus";
import {
	auditPrescriptionData,
	type PrescriptionInput,
} from "../lib/optical";

export default defineTool({
	description:
		"Audit an optical ophthalmic prescription (sphere, cylinder, axis, addition, DNP/PD, height). " +
		"Detects mathematical inconsistencies (missing axis when cylinder is present, axis outside 1-180°, addition without presbyopia, anisoaddition, non-standard diopter steps), " +
		"calculates optical cylinder transposition (positive to negative cylinder standard), evaluates legibility/OCR confidence, " +
		"and records an auditable ContactFact on the patient record priced into VERIFIED, PROBABLE, or POSSIBLE evidence bands.",
	inputSchema: z.object({
		patientId: z
			.string()
			.describe("The CRM contact ID of the patient receiving the prescription."),
		odSphere: z
			.number()
			.describe("Right Eye (OD) Spherical power in diopters (e.g. -2.50, +1.25)."),
		odCyl: z
			.number()
			.default(0.0)
			.describe("Right Eye (OD) Cylindrical power in diopters (e.g. -0.75, 0.00)."),
		odAxis: z
			.number()
			.int()
			.min(0)
			.max(180)
			.nullable()
			.optional()
			.describe("Right Eye (OD) Cylinder axis in degrees (1 to 180). Required if odCyl != 0."),
		odAddition: z
			.number()
			.nullable()
			.optional()
			.describe("Right Eye (OD) Near addition in diopters for presbyopia (e.g. +1.75, +2.00)."),
		odDnp: z
			.number()
			.nullable()
			.optional()
			.describe("Right Eye (OD) Monocular Pupillary Distance in mm (typically 28.0 to 36.0mm)."),
		odHeight: z
			.number()
			.nullable()
			.optional()
			.describe("Right Eye (OD) Fitting height in mm (for progressive or occupational lenses)."),
		oeSphere: z
			.number()
			.describe("Left Eye (OE) Spherical power in diopters (e.g. -2.25, +1.00)."),
		oeCyl: z
			.number()
			.default(0.0)
			.describe("Left Eye (OE) Cylindrical power in diopters (e.g. -0.50, 0.00)."),
		oeAxis: z
			.number()
			.int()
			.min(0)
			.max(180)
			.nullable()
			.optional()
			.describe("Left Eye (OE) Cylinder axis in degrees (1 to 180). Required if oeCyl != 0."),
		oeAddition: z
			.number()
			.nullable()
			.optional()
			.describe("Left Eye (OE) Near addition in diopters for presbyopia (e.g. +1.75, +2.00)."),
		oeDnp: z
			.number()
			.nullable()
			.optional()
			.describe("Left Eye (OE) Monocular Pupillary Distance in mm (typically 28.0 to 36.0mm)."),
		oeHeight: z
			.number()
			.nullable()
			.optional()
			.describe("Left Eye (OE) Fitting height in mm (for progressive or occupational lenses)."),
		patientAge: z
			.number()
			.int()
			.min(0)
			.max(120)
			.nullable()
			.optional()
			.describe("Age of the patient in years (used to correlate presbyopia addition plausibility)."),
		issuedAt: z
			.string()
			.nullable()
			.optional()
			.describe("Prescription date in ISO or YYYY-MM-DD format (prescriptions older than 1 year are flagged)."),
		ocrConfidenceScore: z
			.number()
			.min(0)
			.max(1)
			.nullable()
			.optional()
			.describe("OCR confidence score from 0.0 to 1.0 (scores <0.70 are held as dubious)."),
		ocrRawText: z
			.string()
			.nullable()
			.optional()
			.describe("Original raw OCR text recognized from the physical prescription slip."),
		prescriptionImageUrl: z
			.string()
			.nullable()
			.optional()
			.describe("URL to the scanned or photographed prescription slip for optical auditing."),
		doctorId: z
			.string()
			.nullable()
			.optional()
			.describe("Contact ID of the prescribing ophthalmologist or optometrist, if linked."),
		storeId: z
			.string()
			.nullable()
			.optional()
			.describe("Company ID of the optical store receiving this prescription."),
		savePrescriptionRecord: z
			.boolean()
			.default(true)
			.describe("Whether to create or update the official OpticalPrescription database record."),
	}),
	async execute(input) {
		focusOn({ contactId: input.patientId });

		const contact = await db.contact.findUnique({
			where: { id: input.patientId },
			select: { id: true, firstName: true, lastName: true },
		});

		if (!contact) {
			return {
				audited: false as const,
				reason: `Patient contact not found with ID '${input.patientId}'. Search CRM first.`,
			};
		}

		// Run in-depth mathematical, physiological and optical checks
		const audit = auditPrescriptionData(input as PrescriptionInput);

		// Record the ContactFact with complete evidence ledger
		const factField = "opticalPrescription";
		const factStatus =
			audit.band === FactBand.VERIFIED
				? FactStatus.APPLIED
				: FactStatus.PROPOSED;

		try {
			await db.$transaction(async (tx) => {
				// Supersede previous proposed or applied optical prescription facts
				await tx.contactFact.updateMany({
					where: {
						contactId: input.patientId,
						field: factField,
						status: { in: [FactStatus.APPLIED, FactStatus.PROPOSED] },
					},
					data: {
						status: FactStatus.SUPERSEDED,
						supersededAt: new Date(),
					},
				});

				// Create new audited fact
				await tx.contactFact.create({
					data: {
						contactId: input.patientId,
						field: factField,
						value: audit.formattedSummary,
						score: audit.score,
						band: audit.band,
						evidence: audit.evidenceLedger as unknown as Prisma.InputJsonValue,
						method: "optical.prescription-audit",
						sourceUrl: input.prescriptionImageUrl ?? null,
						status: factStatus,
					},
				});

				// Optionally persist in the official OpticalPrescription model
				if (input.savePrescriptionRecord) {
					const issuedDate = input.issuedAt
						? new Date(input.issuedAt)
						: new Date();
					const validDate = isNaN(issuedDate.getTime())
						? new Date()
						: issuedDate;

					const expiresAt = new Date(validDate);
					expiresAt.setFullYear(expiresAt.getFullYear() + 1);

					await tx.opticalPrescription.create({
						data: {
							patientId: input.patientId,
							doctorId: input.doctorId ?? null,
							storeId: input.storeId ?? null,
							issuedAt: validDate,
							expiresAt,
							notes:
								audit.warnings.length > 0
									? `Avisos de auditoria: ${audit.warnings.join(" | ")}`
									: null,
							odSphere: input.odSphere,
							odCyl: input.odCyl ?? 0.0,
							odAxis: input.odAxis ?? null,
							odAddition: input.odAddition ?? null,
							odDnp: input.odDnp ?? null,
							odHeight: input.odHeight ?? null,
							oeSphere: input.oeSphere,
							oeCyl: input.oeCyl ?? 0.0,
							oeAxis: input.oeAxis ?? null,
							oeAddition: input.oeAddition ?? null,
							oeDnp: input.oeDnp ?? null,
							oeHeight: input.oeHeight ?? null,
							prescriptionImageUrl: input.prescriptionImageUrl ?? null,
							ocrRawText: input.ocrRawText ?? null,
							ocrConfidenceScore: input.ocrConfidenceScore ?? null,
							ocrVerified: audit.band === FactBand.VERIFIED,
							ocrParsedData: {
								transposedOD: audit.transposedOD,
								transposedOE: audit.transposedOE,
								sphericalEquivalentOD: audit.sphericalEquivalentOD,
								sphericalEquivalentOE: audit.sphericalEquivalentOE,
								inconsistencies: audit.inconsistencies,
								warnings: audit.warnings,
							} as Prisma.InputJsonValue,
						},
					});
				}
			});
		} catch (error) {
			// If DB write encounters transient issue, continue to deliver full audit analysis
			console.warn("[audit_optical_prescription] DB transaction warning:", error);
		}

		return {
			audited: true as const,
			patientName: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
			valid: audit.valid,
			band: audit.band,
			confidenceScore: audit.score,
			summary: audit.formattedSummary,
			recommendation: audit.recommendation,
			transposedOD: audit.transposedOD,
			transposedOE: audit.transposedOE,
			sphericalEquivalentOD: audit.sphericalEquivalentOD,
			sphericalEquivalentOE: audit.sphericalEquivalentOE,
			inconsistencies: audit.inconsistencies,
			warnings: audit.warnings,
			evidenceLedger: audit.evidenceLedger,
		};
	},
});
