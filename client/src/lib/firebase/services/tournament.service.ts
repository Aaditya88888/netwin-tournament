import type { Tournament } from '../models';

import { 
  COLLECTIONS, 
  createDocument, 
  updateDocument, 
  deleteDocument, 
  getPaginatedData,
  uploadFile,
  deleteFile,
  BaseDocument,
  PaginationQuery
} from '../index';

type CreateTournamentData = Omit<Tournament, keyof BaseDocument>;

export const TournamentService = {
  async create(data: CreateTournamentData): Promise<string> {
    if (data.coverImage && data.coverImage.startsWith('data:')) {
      // Convert base64 to file and upload
      const file = await fetch(data.coverImage).then(res => res.blob());
      const path = `tournaments/${Date.now()}-cover.jpg`;
      const imageUrl = await uploadFile(path, new File([file], 'cover.jpg'));
      data.coverImage = imageUrl;
    }
    return createDocument<CreateTournamentData>(COLLECTIONS.TOURNAMENTS, data);
  },

  async update(id: string, data: Partial<Tournament>): Promise<void> {
    if (data.coverImage && data.coverImage.startsWith('data:')) {
      const file = await fetch(data.coverImage).then(res => res.blob());
      const path = `tournaments/${id}-${Date.now()}-cover.jpg`;
      const imageUrl = await uploadFile(path, new File([file], 'cover.jpg'));
      data.coverImage = imageUrl;
    }
    return updateDocument<Tournament>(COLLECTIONS.TOURNAMENTS, id, data);
  },

  async delete(id: string, coverImage?: string): Promise<void> {
    if (coverImage) {
      await deleteFile(coverImage);
    }
    return deleteDocument(COLLECTIONS.TOURNAMENTS, id);
  },

  async getList(
    pageSize: number = 10,
    lastDoc?: any,
    status?: Tournament['status']
  ): Promise<PaginationQuery<Tournament>> {
    const whereConditions = status ? [['status', '==', status]] : undefined;
    return getPaginatedData<Tournament>(
      COLLECTIONS.TOURNAMENTS,
      pageSize,
      lastDoc,
      whereConditions as [string, any, any][] | undefined
    );
  },

  async getUpcoming(
    pageSize: number = 10,
    lastDoc?: any
  ): Promise<PaginationQuery<Tournament>> {
    const now = new Date();
    return getPaginatedData<Tournament>(
      COLLECTIONS.TOURNAMENTS,
      pageSize,
      lastDoc,
      [
        ['startTime', '>', now],
        ['status', '==', 'upcoming']
      ] as [string, any, any][],
      'startTime',
      'asc'
    );
  },

  async getOngoing(
    pageSize: number = 10,
    lastDoc?: any
  ): Promise<PaginationQuery<Tournament>> {
    return getPaginatedData<Tournament>(
      COLLECTIONS.TOURNAMENTS,
      pageSize,
      lastDoc,
      [['status', '==', 'ongoing']] as [string, any, any][],
      'startTime',
      'asc'
    );
  }
}; 
