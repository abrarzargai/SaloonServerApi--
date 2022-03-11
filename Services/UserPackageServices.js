import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOneOptions, Repository, UpdateResult } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { projectLanguage } from '../project/entities/project-language.entity';
import { TranslationService } from '../translation/translation.service';
import { CreateWhatsnewDto } from './dto/create-whatsnew.dto';
import { TranslateWhatsNewDto } from './dto/translation-whatsnew.dto';
import { UpdateWhatsnewDto } from './dto/update-whatsnew.dto';
import { Whatsnew } from './entities/whatsnew.entity';

@Injectable()
export class WhatsnewService {
  constructor(
    @InjectRepository(Whatsnew) private whatsnewEntity: Repository<Whatsnew>,
    @InjectRepository(projectLanguage) private projectLanguageEntity: Repository<projectLanguage>,
    private readonly translationService: TranslationService,
  ) {}
  async create(createWhatsnewDto: CreateWhatsnewDto): Promise<Whatsnew> {
    const { projectId } = await this.projectLanguageEntity.findOne({ id: createWhatsnewDto.projectLanguageId });
    console.log('Project', projectId);
    const response = await this.findOne({
      relations: ['projectLanguage'],
      where: { projectLanguage: { projectId: projectId }, appVersion: createWhatsnewDto.appVersion },
    });
    if (!response) {
      return this.whatsnewEntity.save(createWhatsnewDto);
    } else {
      throw new HttpException(
        `version ${createWhatsnewDto.appVersion} is already exist for this project`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  findAll(options: FindManyOptions<Whatsnew>): Promise<Whatsnew[]> {
    return this.whatsnewEntity.find(options);
  }

  findOne(options: FindOneOptions<Whatsnew>): Promise<Whatsnew> {
    return this.whatsnewEntity.findOne(options);
  }

  update(id: string, updateWhatsnewDto: UpdateWhatsnewDto): Promise<UpdateResult> {
    return this.whatsnewEntity.update(id, updateWhatsnewDto);
  }

  remove(id: string): Promise<UpdateResult> {
    return this.whatsnewEntity.softDelete(id);
  }

  async translate(translatewhatsnewDto: TranslateWhatsNewDto): Promise<Whatsnew> {
    //geting stroelisting description and from language code
    const { description, projectLanguage, appVersion } = await this.findOne({
      where: { id: translatewhatsnewDto.whatsNewId },
      relations: ['projectLanguage', 'projectLanguage.language', 'projectLanguage.project'],
    });
    console.log('Description :', description);
    console.log('ProjectLanguage :', projectLanguage.language.code);
    //target lanaguage to
    const { language } = await this.projectLanguageEntity.findOne({
      relations: ['language'],
      where: { id: translatewhatsnewDto.projectLanguageId },
    });
    console.log('Target Language :', language);
    //translation Handler
    const translatedJSON = await this.translationService.translate({
      text: description,
      from: projectLanguage.language.code,
      to: language.code,
      translationServiceId: projectLanguage.project.translationServiceId,
    });
    //if all ready translated just update it
    const saveData: UpdateWhatsnewDto = {
      description: translatedJSON.translated_text[language.code],
      executedById: translatewhatsnewDto.executedById,
      projectLanguageId: translatewhatsnewDto.projectLanguageId,
      appVersion: appVersion,
    };

    const whatsnew = await this.findOne({
      where: { projectLanguageId: translatewhatsnewDto.projectLanguageId },
    });
    if (whatsnew) saveData.id = whatsnew.id;
    else saveData.id = uuid();
    return this.whatsnewEntity.save(saveData);
  }
}
