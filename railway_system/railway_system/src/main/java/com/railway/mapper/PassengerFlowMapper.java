package com.railway.mapper;

import com.railway.entity.PassengerFlow;
import org.apache.ibatis.annotations.*;
import java.util.List;
import java.util.Map;

@Mapper
public interface PassengerFlowMapper {
    
    // 查询全部（不限制数量）
    @Select("SELECT * FROM passenger_flow ORDER BY flow_date DESC, id DESC")
    @ResultMap("com.railway.mapper.PassengerFlowMapper.BaseResultMap")
    List<PassengerFlow> findAll();
    
    // 分页查询
    @Select("SELECT * FROM passenger_flow ORDER BY flow_date DESC, id DESC LIMIT #{offset}, #{limit}")
    @ResultMap("com.railway.mapper.PassengerFlowMapper.BaseResultMap")
    List<PassengerFlow> findByPage(@Param("offset") int offset, @Param("limit") int limit);
    
    @Select("SELECT * FROM passenger_flow WHERE id = #{id}")
    @ResultMap("com.railway.mapper.PassengerFlowMapper.BaseResultMap")
    PassengerFlow findById(Integer id);
    
    @Insert("INSERT INTO passenger_flow(" +
            "line_id, train_id, station_id, skzld, sxbm, flow_date, operate_time, time_interval, " +
            "start_station_time, start_station_depart, arrive_time, depart_time, " +
            "boarding, alighting, remark, train_depart_date, train_depart_time, sequence_no, " +
            "ticket_type, ticket_price, seat_type, train_copo, ticket_date, " +
            "origin_station_id, origin_station_static, origin_station_start, " +
            "dest_station_id, dest_station_static, dest_station_end, " +
            "train_class, train_type, sale_station_id, station_limit, static_sps, to_station_id, revenue) " +
            "VALUES(#{lineId}, #{trainId}, #{stationId}, #{skzld}, #{sxbm}, #{flowDate}, #{operateTime}, #{timeInterval}, " +
            "#{startStationTime}, #{startStationDepart}, #{arriveTime}, #{departTime}, " +
            "#{boarding}, #{alighting}, #{remark}, #{trainDepartDate}, #{trainDepartTime}, #{sequenceNo}, " +
            "#{ticketType}, #{ticketPrice}, #{seatType}, #{trainCopo}, #{ticketDate}, " +
            "#{originStationId}, #{originStationStatic}, #{originStationStart}, " +
            "#{destStationId}, #{destStationStatic}, #{destStationEnd}, " +
            "#{trainClass}, #{trainType}, #{saleStationId}, #{stationLimit}, #{staticSps}, #{toStationId}, #{revenue})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(PassengerFlow flow);
    
    @Delete("DELETE FROM passenger_flow WHERE id = #{id}")
    int delete(Integer id);
    
    @Delete("DELETE FROM passenger_flow")
    int deleteAll();
    
    @Update("UPDATE passenger_flow SET " +
            "line_id=#{lineId}, train_id=#{trainId}, station_id=#{stationId}, " +
            "flow_date=#{flowDate}, arrive_time=#{arriveTime}, depart_time=#{departTime}, " +
            "boarding=#{boarding}, alighting=#{alighting}, remark=#{remark}, " +
            "ticket_type=#{ticketType}, ticket_price=#{ticketPrice}, seat_type=#{seatType}, " +
            "train_class=#{trainClass}, train_type=#{trainType}, " +
            "origin_station_id=#{originStationId}, dest_station_id=#{destStationId}, revenue=#{revenue} " +
            "WHERE id=#{id}")
    int update(PassengerFlow flow);
    
    // ==================== 基础统计 ====================
    
    // 按日期统计客流（不限制数量）
    @Select("SELECT DATE(flow_date) as date, SUM(boarding) as boarding, SUM(alighting) as alighting, " +
            "SUM(revenue) as revenue, COUNT(*) as count " +
            "FROM passenger_flow GROUP BY DATE(flow_date) ORDER BY date DESC")
    List<Map<String, Object>> dailyFlow();
    
    // 按日期范围统计客流
    @Select("SELECT DATE(flow_date) as date, SUM(boarding) as boarding, SUM(alighting) as alighting, " +
            "SUM(revenue) as revenue FROM passenger_flow " +
            "WHERE flow_date BETWEEN #{startDate} AND #{endDate} " +
            "GROUP BY DATE(flow_date) ORDER BY date")
    List<Map<String, Object>> dailyFlowByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);
    
    // 按周统计
    @Select("SELECT DAYOFWEEK(flow_date) as weekday, SUM(boarding) as flow, SUM(revenue) as revenue " +
            "FROM passenger_flow GROUP BY DAYOFWEEK(flow_date) ORDER BY weekday")
    List<Map<String, Object>> weeklyFlow();
    
    // 按周统计（指定日期范围）
    @Select("SELECT DAYOFWEEK(flow_date) as weekday, SUM(boarding) as flow " +
            "FROM passenger_flow WHERE flow_date BETWEEN #{startDate} AND #{endDate} " +
            "GROUP BY DAYOFWEEK(flow_date) ORDER BY weekday")
    List<Map<String, Object>> weeklyFlowByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);
    
    // 按月统计（不限制数量）
    @Select("SELECT DATE_FORMAT(flow_date, '%Y-%m') as month, SUM(boarding) as boarding, " +
            "SUM(alighting) as alighting, SUM(revenue) as revenue " +
            "FROM passenger_flow GROUP BY DATE_FORMAT(flow_date, '%Y-%m') ORDER BY month DESC")
    List<Map<String, Object>> monthlyFlow();
    
    // 按月统计（指定日期范围）
    @Select("SELECT DATE_FORMAT(flow_date, '%Y-%m') as month, SUM(boarding) as boarding, SUM(revenue) as revenue " +
            "FROM passenger_flow WHERE flow_date BETWEEN #{startDate} AND #{endDate} " +
            "GROUP BY DATE_FORMAT(flow_date, '%Y-%m') ORDER BY month")
    List<Map<String, Object>> monthlyFlowByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);
    
    // 按小时统计客流
    @Select("SELECT HOUR(depart_time) as hour, SUM(boarding) as flow, COUNT(*) as count " +
            "FROM passenger_flow WHERE depart_time IS NOT NULL " +
            "GROUP BY HOUR(depart_time) ORDER BY hour")
    List<Map<String, Object>> hourlyFlow();
    
    // 按小时统计客流（按日期范围）
    @Select("SELECT HOUR(depart_time) as hour, SUM(boarding) as flow, COUNT(*) as count " +
            "FROM passenger_flow WHERE depart_time IS NOT NULL " +
            "AND flow_date BETWEEN #{startDate} AND #{endDate} " +
            "GROUP BY HOUR(depart_time) ORDER BY hour")
    List<Map<String, Object>> hourlyFlowByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);
    
    // 工作日按小时统计客流（周一到周五）
    @Select("SELECT HOUR(depart_time) as hour, SUM(boarding) as flow " +
            "FROM passenger_flow WHERE depart_time IS NOT NULL " +
            "AND DAYOFWEEK(flow_date) BETWEEN 2 AND 6 " +
            "GROUP BY HOUR(depart_time) ORDER BY hour")
    List<Map<String, Object>> hourlyFlowWeekday();
    
    // 工作日按小时统计客流（按日期范围）
    @Select("SELECT HOUR(depart_time) as hour, SUM(boarding) as flow " +
            "FROM passenger_flow WHERE depart_time IS NOT NULL " +
            "AND DAYOFWEEK(flow_date) BETWEEN 2 AND 6 " +
            "AND flow_date BETWEEN #{startDate} AND #{endDate} " +
            "GROUP BY HOUR(depart_time) ORDER BY hour")
    List<Map<String, Object>> hourlyFlowWeekdayByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);
    
    // 周末按小时统计客流（周六周日）
    @Select("SELECT HOUR(depart_time) as hour, SUM(boarding) as flow " +
            "FROM passenger_flow WHERE depart_time IS NOT NULL " +
            "AND DAYOFWEEK(flow_date) IN (1, 7) " +
            "GROUP BY HOUR(depart_time) ORDER BY hour")
    List<Map<String, Object>> hourlyFlowWeekend();
    
    // 周末按小时统计客流（按日期范围）
    @Select("SELECT HOUR(depart_time) as hour, SUM(boarding) as flow " +
            "FROM passenger_flow WHERE depart_time IS NOT NULL " +
            "AND DAYOFWEEK(flow_date) IN (1, 7) " +
            "AND flow_date BETWEEN #{startDate} AND #{endDate} " +
            "GROUP BY HOUR(depart_time) ORDER BY hour")
    List<Map<String, Object>> hourlyFlowWeekendByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);
    
    // ==================== 客流量统计 ====================
    
    // 总客流量
    @Select("SELECT COALESCE(SUM(boarding), 0) FROM passenger_flow")
    Long totalBoarding();
    
    // 总客流量（按日期范围）
    @Select("SELECT COALESCE(SUM(boarding), 0) FROM passenger_flow WHERE flow_date BETWEEN #{startDate} AND #{endDate}")
    Long totalBoardingByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);
    
    // 今日客流
    @Select("SELECT COALESCE(SUM(boarding), 0) FROM passenger_flow WHERE DATE(flow_date) = CURDATE()")
    Long todayBoarding();
    
    // 昨日客流
    @Select("SELECT COALESCE(SUM(boarding), 0) FROM passenger_flow WHERE DATE(flow_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)")
    Long yesterdayBoarding();
    
    // 本周客流
    @Select("SELECT COALESCE(SUM(boarding), 0) FROM passenger_flow WHERE YEARWEEK(flow_date, 1) = YEARWEEK(CURDATE(), 1)")
    Long weekBoarding();
    
    // 上周客流
    @Select("SELECT COALESCE(SUM(boarding), 0) FROM passenger_flow WHERE YEARWEEK(flow_date, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1)")
    Long lastWeekBoarding();
    
    // 本月客流
    @Select("SELECT COALESCE(SUM(boarding), 0) FROM passenger_flow WHERE DATE_FORMAT(flow_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')")
    Long monthBoarding();
    
    // 上月客流
    @Select("SELECT COALESCE(SUM(boarding), 0) FROM passenger_flow WHERE DATE_FORMAT(flow_date, '%Y-%m') = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m')")
    Long lastMonthBoarding();
    
    // 总收入
    @Select("SELECT COALESCE(SUM(revenue), 0) FROM passenger_flow")
    Double totalRevenue();
    
    // ==================== 站点分析 ====================
    
    // 按站点统计客流（发送量）
    @Select("SELECT station_id as stationId, SUM(boarding) as boarding, SUM(alighting) as alighting, " +
            "SUM(boarding) + SUM(alighting) as total, COUNT(*) as count " +
            "FROM passenger_flow GROUP BY station_id ORDER BY total DESC LIMIT 20")
    List<Map<String, Object>> stationFlow();
    
    // 站点发送量排名
    @Select("SELECT pf.station_id as stationId, s.station_name as stationName, " +
            "SUM(pf.boarding) as boarding, SUM(pf.alighting) as alighting " +
            "FROM passenger_flow pf LEFT JOIN stations s ON pf.station_id = s.id " +
            "GROUP BY pf.station_id, s.station_name ORDER BY boarding DESC LIMIT 20")
    List<Map<String, Object>> stationBoardingRank();
    
    // 所有站点客流（用于地图显示，不限制数量）
    @Select("SELECT pf.station_id as stationId, s.station_name as stationName, " +
            "SUM(pf.boarding) as boarding, SUM(pf.alighting) as alighting " +
            "FROM passenger_flow pf LEFT JOIN stations s ON pf.station_id = s.id " +
            "GROUP BY pf.station_id, s.station_name ORDER BY boarding DESC")
    List<Map<String, Object>> allStationFlow();
    
    // 站点发送量排名（按日期范围）
    @Select("SELECT pf.station_id as stationId, s.station_name as stationName, " +
            "SUM(pf.boarding) as boarding, SUM(pf.alighting) as alighting " +
            "FROM passenger_flow pf LEFT JOIN stations s ON pf.station_id = s.id " +
            "WHERE pf.flow_date BETWEEN #{startDate} AND #{endDate} " +
            "GROUP BY pf.station_id, s.station_name ORDER BY boarding DESC LIMIT 20")
    List<Map<String, Object>> stationBoardingRankByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);
    
    // 站点到达量排名
    @Select("SELECT pf.station_id as stationId, s.station_name as stationName, " +
            "SUM(pf.alighting) as alighting, SUM(pf.boarding) as boarding " +
            "FROM passenger_flow pf LEFT JOIN stations s ON pf.station_id = s.id " +
            "GROUP BY pf.station_id, s.station_name ORDER BY alighting DESC LIMIT 20")
    List<Map<String, Object>> stationAlightingRank();
    
    // 站点时段分布
    @Select("SELECT station_id as stationId, HOUR(depart_time) as hour, SUM(boarding) as flow " +
            "FROM passenger_flow WHERE station_id = #{stationId} AND depart_time IS NOT NULL " +
            "GROUP BY station_id, HOUR(depart_time) ORDER BY hour")
    List<Map<String, Object>> stationHourlyFlow(@Param("stationId") Integer stationId);
    
    // 站点总客流量
    @Select("SELECT SUM(boarding) FROM passenger_flow WHERE station_id = #{stationId}")
    Long stationTotalFlow(@Param("stationId") Integer stationId);
    
    // ==================== OD分析 ====================
    
    // OD客流统计
    @Select("SELECT origin_station_id as originId, dest_station_id as destId, " +
            "COUNT(*) as count, SUM(boarding) as flow, SUM(revenue) as revenue " +
            "FROM passenger_flow WHERE origin_station_id IS NOT NULL AND dest_station_id IS NOT NULL " +
            "GROUP BY origin_station_id, dest_station_id ORDER BY flow DESC LIMIT 30")
    List<Map<String, Object>> odFlow();
    
    // OD客流带站点名称
    @Select("SELECT pf.origin_station_id as originId, s1.station_name as originName, " +
            "pf.dest_station_id as destId, s2.station_name as destName, " +
            "COUNT(*) as count, SUM(pf.boarding) as flow, SUM(pf.revenue) as revenue " +
            "FROM passenger_flow pf " +
            "LEFT JOIN stations s1 ON pf.origin_station_id = s1.id " +
            "LEFT JOIN stations s2 ON pf.dest_station_id = s2.id " +
            "WHERE pf.origin_station_id IS NOT NULL AND pf.dest_station_id IS NOT NULL " +
            "GROUP BY pf.origin_station_id, s1.station_name, pf.dest_station_id, s2.station_name " +
            "ORDER BY flow DESC LIMIT 20")
    List<Map<String, Object>> odFlowWithNames();
    
    // OD客流带站点名称（按日期范围）
    @Select("SELECT pf.origin_station_id as originId, s1.station_name as originName, " +
            "pf.dest_station_id as destId, s2.station_name as destName, " +
            "COUNT(*) as count, SUM(pf.boarding) as flow, SUM(pf.revenue) as revenue " +
            "FROM passenger_flow pf " +
            "LEFT JOIN stations s1 ON pf.origin_station_id = s1.id " +
            "LEFT JOIN stations s2 ON pf.dest_station_id = s2.id " +
            "WHERE pf.origin_station_id IS NOT NULL AND pf.dest_station_id IS NOT NULL " +
            "AND pf.flow_date BETWEEN #{startDate} AND #{endDate} " +
            "GROUP BY pf.origin_station_id, s1.station_name, pf.dest_station_id, s2.station_name " +
            "ORDER BY flow DESC LIMIT 20")
    List<Map<String, Object>> odFlowWithNamesByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);
    
    // ==================== 线路分析 ====================
    
    // 按线路统计客流
    @Select("SELECT line_id as lineId, SUM(boarding) as boarding, SUM(alighting) as alighting, " +
            "SUM(revenue) as revenue, COUNT(DISTINCT train_id) as trainCount " +
            "FROM passenger_flow WHERE line_id IS NOT NULL " +
            "GROUP BY line_id ORDER BY boarding DESC")
    List<Map<String, Object>> lineFlow();
    
    // 线路断面客流（各站点客流）
    @Select("SELECT pf.station_id as stationId, s.station_name as stationName, " +
            "SUM(pf.boarding) as boarding, SUM(pf.alighting) as alighting " +
            "FROM passenger_flow pf LEFT JOIN stations s ON pf.station_id = s.id " +
            "WHERE pf.line_id = #{lineId} " +
            "GROUP BY pf.station_id, s.station_name ORDER BY pf.station_id")
    List<Map<String, Object>> lineSectionFlow(@Param("lineId") Integer lineId);
    
    // ==================== 列车分析 ====================
    
    // 按列车统计客流
    @Select("SELECT train_id as trainId, SUM(boarding) as boarding, SUM(alighting) as alighting, " +
            "SUM(revenue) as revenue FROM passenger_flow WHERE train_id IS NOT NULL " +
            "GROUP BY train_id ORDER BY boarding DESC LIMIT 20")
    List<Map<String, Object>> trainFlow();
    
    // ==================== 票务分析 ====================
    
    // 按座位类型统计
    @Select("SELECT seat_type as seatType, COUNT(*) as count, " +
            "COALESCE(SUM(boarding), COUNT(*)) as flow, COALESCE(SUM(revenue), 0) as revenue " +
            "FROM passenger_flow WHERE seat_type IS NOT NULL AND seat_type != '' " +
            "GROUP BY seat_type ORDER BY flow DESC")
    List<Map<String, Object>> seatTypeStats();
    
    // 按座位类型统计（按日期范围）
    @Select("SELECT seat_type as seatType, COUNT(*) as count, " +
            "COALESCE(SUM(boarding), COUNT(*)) as flow, COALESCE(SUM(revenue), 0) as revenue " +
            "FROM passenger_flow WHERE seat_type IS NOT NULL AND seat_type != '' " +
            "AND flow_date BETWEEN #{startDate} AND #{endDate} " +
            "GROUP BY seat_type ORDER BY flow DESC")
    List<Map<String, Object>> seatTypeStatsByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);
    
    // 按列车类型统计
    @Select("SELECT train_type as trainType, COUNT(*) as count, SUM(boarding) as flow, SUM(revenue) as revenue " +
            "FROM passenger_flow WHERE train_type IS NOT NULL AND train_type != '' " +
            "GROUP BY train_type ORDER BY flow DESC")
    List<Map<String, Object>> trainTypeStats();
    
    // 按列车等级统计
    @Select("SELECT train_class as trainClass, COUNT(*) as count, SUM(boarding) as flow, SUM(revenue) as revenue " +
            "FROM passenger_flow WHERE train_class IS NOT NULL AND train_class != '' " +
            "GROUP BY train_class ORDER BY flow DESC")
    List<Map<String, Object>> trainClassStats();
    
    // 按票类型统计
    @Select("SELECT ticket_type as ticketType, COUNT(*) as count, SUM(boarding) as flow " +
            "FROM passenger_flow WHERE ticket_type IS NOT NULL AND ticket_type != '' " +
            "GROUP BY ticket_type ORDER BY flow DESC")
    List<Map<String, Object>> ticketTypeStats();
    
    // ==================== 同比环比 ====================
    
    // 指定日期的客流
    @Select("SELECT COALESCE(SUM(boarding), 0) FROM passenger_flow WHERE DATE(flow_date) = #{date}")
    Long flowByDate(@Param("date") String date);
    
    // 日期范围内的客流
    @Select("SELECT COALESCE(SUM(boarding), 0) FROM passenger_flow WHERE flow_date BETWEEN #{startDate} AND #{endDate}")
    Long flowByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);
    
    // 记录总数
    @Select("SELECT COUNT(*) FROM passenger_flow")
    Long count();
    
    // 批量插入
    int batchInsert(List<PassengerFlow> flows);
    
    // ==================== 节假日分析 ====================
    
    // 按日期统计客流（用于节假日分析）
    @Select("SELECT DATE(flow_date) as date, DAYOFWEEK(flow_date) as weekday, " +
            "SUM(boarding) as boarding, SUM(alighting) as alighting, SUM(revenue) as revenue " +
            "FROM passenger_flow GROUP BY DATE(flow_date), DAYOFWEEK(flow_date) ORDER BY date")
    List<Map<String, Object>> dailyFlowWithWeekday();
    
    // 按日期范围统计客流（用于节假日分析）
    @Select("SELECT DATE(flow_date) as date, DAYOFWEEK(flow_date) as weekday, " +
            "SUM(boarding) as boarding, SUM(alighting) as alighting, SUM(revenue) as revenue " +
            "FROM passenger_flow WHERE flow_date BETWEEN #{startDate} AND #{endDate} " +
            "GROUP BY DATE(flow_date), DAYOFWEEK(flow_date) ORDER BY date")
    List<Map<String, Object>> dailyFlowWithWeekdayByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);
    
    // ==================== 服务能力评估 ====================
    
    // 站点高峰时段客流
    @Select("SELECT pf.station_id as stationId, s.station_name as stationName, " +
            "HOUR(pf.depart_time) as hour, SUM(pf.boarding) as boarding, SUM(pf.alighting) as alighting " +
            "FROM passenger_flow pf LEFT JOIN stations s ON pf.station_id = s.id " +
            "WHERE pf.depart_time IS NOT NULL " +
            "GROUP BY pf.station_id, s.station_name, HOUR(pf.depart_time) " +
            "ORDER BY pf.station_id, hour")
    List<Map<String, Object>> stationHourlyFlowAll();
    
    // 站点日均客流
    @Select("SELECT pf.station_id as stationId, s.station_name as stationName, " +
            "AVG(daily_flow) as avgDailyFlow, MAX(daily_flow) as maxDailyFlow " +
            "FROM (SELECT station_id, DATE(flow_date) as flow_day, SUM(boarding) as daily_flow " +
            "      FROM passenger_flow GROUP BY station_id, DATE(flow_date)) pf " +
            "LEFT JOIN stations s ON pf.station_id = s.id " +
            "GROUP BY pf.station_id, s.station_name ORDER BY avgDailyFlow DESC")
    List<Map<String, Object>> stationAvgDailyFlow();
}
