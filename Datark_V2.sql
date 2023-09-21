/*==============================================================*/
/* Nom de SGBD :  MySQL 5.0                                     */
/* Date de cr�ation :  21/09/2023 12:08:26                      */
/*==============================================================*/


drop table if exists ADMIN;

drop table if exists FILE;

drop table if exists FOLLOW;

drop table if exists LIKED;

drop table if exists SUBSCRIBE;

drop table if exists USER;

drop table if exists VERIFICATION_FILE;

/*==============================================================*/
/* Table : ADMIN                                                */
/*==============================================================*/
create table ADMIN
(
   ID_ADMIN             int not null AUTO_INCREMENT,
   FIRSTNAME            varchar(255) not null,
   SURNAME              varchar(255) not null,
   EMAIL                varchar(255) not null,
   PASSWORD             varchar(255) not null,
   USERNAME             varchar(255) not null,
   primary key (ID_ADMIN)
);

/*==============================================================*/
/* Table : FILE                                                 */
/*==============================================================*/
create table FILE
(
   ID_FILES             int not null AUTO_INCREMENT,
   ID_USER              int not null,
   NAME                 varchar(255) not null,
   DESCRIPTION          longtext not null,
   DATE_CREATION        date not null,
   DATE_UPLOAD          datetime not null,
   primary key (ID_FILES)
);

/*==============================================================*/
/* Table : FOLLOW                                               */
/*==============================================================*/
create table FOLLOW
(
   FOLLOWED             int not null,
   ID_USER              int not null,
   primary key (FOLLOWED, ID_USER)
);

/*==============================================================*/
/* Table : LIKED                                                */
/*==============================================================*/
create table LIKED
(
   ID_USER              int not null,
   ID_FILES             int not null,
   primary key (ID_USER, ID_FILES)
);

/*==============================================================*/
/* Table : SUBSCRIBE                                            */
/*==============================================================*/
create table SUBSCRIBE
(
   ID_SUBSCRIBE         int not null AUTO_INCREMENT,
   NAME                 varchar(255) not null,
   DESCRIPTION          longtext not null,
   PRICE                float not null,
   primary key (ID_SUBSCRIBE)
);

/*==============================================================*/
/* Table : USER                                                 */
/*==============================================================*/
create table USER
(
   ID_USER              int not null AUTO_INCREMENT,
   ID_SUBSCRIBE         int,
   FIRSTNAME            varchar(255) not null,
   SURNAME              varchar(255) not null,
   EMAIL                varchar(255) not null,
   PASSWORD             varchar(255) not null,
   COUNTRY              varchar(255) not null,
   CITY                 varchar(255) not null,
   BIRTHDAY             date not null,
   primary key (ID_USER)
);

/*==============================================================*/
/* Table : VERIFICATION_FILE                                    */
/*==============================================================*/
create table VERIFICATION_FILE
(
   ID_VERIFICATRION_FILE int not null AUTO_INCREMENT,
   ID_ADMIN             int,
   NAME                 varchar(255) not null,
   EXTENTION            varchar(4) not null,
   VALIDATED            bool,
   DATE_UPLOAD          datetime not null,
   DATE_VERIFICATION    datetime,
   primary key (ID_VERIFICATRION_FILE)
);

alter table FILE add constraint FK_OWNED foreign key (ID_USER)
      references USER (ID_USER) on delete restrict on update restrict;

alter table FOLLOW add constraint FK_FOLLOWER foreign key (ID_USER)
      references USER (ID_USER) on delete restrict on update restrict;
      
alter table FOLLOW add constraint FK_FOLLOWED foreign key (FOLLOWED)
      references USER (ID_USER) on delete restrict on update restrict

alter table LIKED add constraint FK_LIKED foreign key (ID_FILES)
      references FILE (ID_FILES) on delete restrict on update restrict;

alter table LIKED add constraint FK_LIKED2 foreign key (ID_USER)
      references USER (ID_USER) on delete restrict on update restrict;

alter table USER add constraint FK_SUBSCRIBED foreign key (ID_SUBSCRIBE)
      references SUBSCRIBE (ID_SUBSCRIBE) on delete restrict on update restrict;

alter table VERIFICATION_FILE add constraint FK_CHECKED foreign key (ID_ADMIN)
      references ADMIN (ID_ADMIN) on delete restrict on update restrict;

